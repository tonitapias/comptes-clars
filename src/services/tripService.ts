import { 
  collection, doc, addDoc, updateDoc, deleteDoc, setDoc, 
  arrayUnion, arrayRemove, query, where, getDocs, getDoc 
} from 'firebase/firestore'; // <--- ASSEGURA'T QUE arrayRemove ESTÀ IMPORTAT
import { User } from 'firebase/auth';
import { db, appId } from '../config/firebase';
import { Expense, TripData, Settlement, TripUser } from '../types';

const getTripRef = (tripId: string) => doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`);
const getExpensesCol = (tripId: string) => collection(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`, 'expenses');
const getExpenseRef = (tripId: string, expenseId: string) => doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`, 'expenses', expenseId);

const generateId = () => crypto.randomUUID();

export const TripService = {
  createTrip: async (trip: TripData) => {
    await setDoc(getTripRef(trip.id), trip);
  },

  getUserTrips: async (userId: string) => {
    const tripsRef = collection(db, 'artifacts', appId, 'public', 'data', 'trips');
    const q = query(tripsRef, where('memberUids', 'array-contains', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as TripData);
  },

  updateTrip: async (tripId: string, data: Partial<TripData>) => {
    await updateDoc(getTripRef(tripId), data);
  },

  // --- NOVETAT 1: UNIR-SE VIA ENLLAÇ (Automàtic) ---
  joinTripViaLink: async (tripId: string, user: User) => {
    const tripRef = getTripRef(tripId);
    const snap = await getDoc(tripRef);
    
    if (!snap.exists()) throw new Error("El grup no existeix");
    
    const trip = snap.data() as TripData;
    
    // 1. Si ja té permís d'accés (memberUids), no fem res
    if (trip.memberUids?.includes(user.uid)) return;

    // 2. Mirem si el seu compte de Google ja està vinculat a algun perfil existent
    // (Per exemple, si algú el va crear manualment i ara entra ell)
    const existingProfileIndex = trip.users.findIndex(u => u.linkedUid === user.uid);
    
    if (existingProfileIndex === -1) {
        // CAS A: Usuari totalment nou -> El creem
        const newTripUser: TripUser = {
            id: generateId(),
            name: user.displayName || 'Anònim',
            email: user.email || undefined,
            isAuth: true,
            linkedUid: user.uid,
            photoUrl: user.photoURL || null,
            isDeleted: false
        };
        
        await updateDoc(tripRef, {
            users: arrayUnion(newTripUser),
            memberUids: arrayUnion(user.uid)
        });
    } else {
        // CAS B: Ja existia però no tenia permís a memberUids (cas rar, però possible)
        await updateDoc(tripRef, { memberUids: arrayUnion(user.uid) });
    }
  },

  // --- NOVETAT 2: SORTIDA SEGURA (Substitueix removeUserFromTrip) ---
  // Aquesta funció protegeix els càlculs:
  // - Si l'usuari NO té moviments -> L'esborra del tot.
  // - Si l'usuari TÉ moviments -> El marca com a 'isDeleted' i li treu l'accés.
  leaveTrip: async (tripId: string, userIdToRemove: string) => {
    const tripRef = getTripRef(tripId);
    const snap = await getDoc(tripRef);
    
    if (snap.exists()) {
        const trip = snap.data() as TripData;
        
        // Comprovem si ha participat en alguna despesa (pagant o rebent)
        const hasHistory = trip.expenses.some(e => 
            e.payer === userIdToRemove || e.involved.includes(userIdToRemove)
        );

        // Usuari que volem treure
        const userObj = trip.users.find(u => u.id === userIdToRemove);
        if (!userObj) return;

        // Recuperem el seu UID de Google si en té, per treure'l de memberUids
        const authUidToRemove = userObj.linkedUid;

        if (hasHistory) {
            // OPCIÓ A: SOFT DELETE (Té historial, no podem esborrar-lo)
            const updatedUsers = trip.users.map(u => {
                if (u.id === userIdToRemove) {
                    return { 
                        ...u, 
                        linkedUid: null,  // Li treiem l'accés
                        isAuth: false,
                        photoUrl: null,   // Li treiem la foto
                        name: `${u.name} (Ex-membre)`, // Opcional: Marquem el nom
                        isDeleted: true   // MARCA CLAU PER FILTRAR A LA UI
                    };
                }
                return u;
            });

            const updates: any = { users: updatedUsers };
            if (authUidToRemove) {
                updates.memberUids = arrayRemove(authUidToRemove);
            }
            await updateDoc(tripRef, updates);

        } else {
            // OPCIÓ B: HARD DELETE (No té historial, neteja total)
            const updates: any = { users: arrayRemove(userObj) };
            if (authUidToRemove) {
                updates.memberUids = arrayRemove(authUidToRemove);
            }
            await updateDoc(tripRef, updates);
        }
    }
  },

  // --- Funcions existents que mantenim o adaptem lleugerament ---

  linkAuthUser: async (tripId: string, uid: string) => {
    await updateDoc(getTripRef(tripId), { memberUids: arrayUnion(uid) });
  },

  linkUserToAccount: async (tripId: string, tripUserId: string, user: User) => {
    const tripRef = getTripRef(tripId);
    const snap = await getDoc(tripRef);
    if (!snap.exists()) throw new Error("Grup no trobat");
    
    const trip = snap.data() as TripData;
    const authUid = user.uid;
    const photoUrl = user.photoURL || null;

    const updatedUsers = trip.users.map(u => {
        // Desvinculem si ja estava en un altre lloc
        if (u.linkedUid === authUid) return { ...u, linkedUid: null, isAuth: false, photoUrl: null };
        return u;
    });

    const finalUsers = updatedUsers.map(u => {
        // Vinculem al nou lloc
        if (u.id === tripUserId) return { ...u, linkedUid: authUid, isAuth: true, photoUrl: photoUrl, isDeleted: false };
        return u;
    });

    await updateDoc(tripRef, { users: finalUsers, memberUids: arrayUnion(authUid) });
  },

  addUser: async (tripId: string, userName: string) => {
    const newUser: TripUser = { id: generateId(), name: userName, isDeleted: false };
    await updateDoc(getTripRef(tripId), { users: arrayUnion(newUser) });
  },

  renameUser: async (tripId: string, userId: string, newName: string) => {
    const tripRef = getTripRef(tripId);
    const snap = await getDoc(tripRef);
    if (!snap.exists()) throw new Error("Grup no trobat");
    const trip = snap.data() as TripData;
    const updatedUsers = trip.users.map(u => u.id === userId ? { ...u, name: newName } : u);
    await updateDoc(tripRef, { users: updatedUsers });
  },

  addExpense: async (tripId: string, expense: Omit<Expense, 'id'>) => {
    await addDoc(getExpensesCol(tripId), expense);
  },

  updateExpense: async (tripId: string, expenseId: string, expense: Partial<Expense>) => {
    await updateDoc(getExpenseRef(tripId, expenseId), expense);
  },

  deleteExpense: async (tripId: string, expenseId: string) => {
    await deleteDoc(getExpenseRef(tripId, expenseId));
  },

  settleDebt: async (tripId: string, settlement: Settlement, method: string) => {
    const repayment = {
      title: `Pagament deute (${method})`, 
      amount: settlement.amount, 
      payer: settlement.from,
      category: 'transfer' as const, 
      involved: [settlement.to], 
      date: new Date().toISOString(), 
      splitType: 'equal' as const
    };
    await addDoc(getExpensesCol(tripId), repayment);
  },
  // --- NOVETAT: TREURE ACCÉS (Emergència) ---
  // Serveix per quan l'usuari vol treure el grup de la llista "Els meus viatges"
  // però no trobem el seu perfil intern per fer el "Soft Delete".
  removeMemberAccess: async (tripId: string, authUid: string) => {
    const tripRef = getTripRef(tripId);
    await updateDoc(tripRef, { memberUids: arrayRemove(authUid) });
  },
};
