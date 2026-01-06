import { 
  collection, doc, addDoc, updateDoc, deleteDoc, setDoc, 
  arrayUnion, query, where, getDocs, getDoc
} from 'firebase/firestore';
import { User } from 'firebase/auth'; // <--- Importació necessària
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

  // --- ABANDONAR GRUP (Usuari surt pel seu propi peu) ---
  leaveTrip: async (tripId: string, userId: string) => {
    const tripRef = getTripRef(tripId);
    const snap = await getDoc(tripRef);
    
    if (snap.exists()) {
        const trip = snap.data() as TripData;
        
        // 1. Et traiem de la llista de membres (ja no et surt a la home)
        const newMemberUids = (trip.memberUids || []).filter(uid => uid !== userId);
        
        // 2. Desvinculem el teu usuari dins del grup
        const newUsers = trip.users.map(u => {
            if (u.linkedUid === userId) {
                // IMPORTANT: Use null, no undefined
                return { ...u, linkedUid: null, isAuth: false, photoUrl: null };
            }
            return u;
        });

        await updateDoc(tripRef, { 
            memberUids: newMemberUids,
            users: newUsers
        });
    }
  },

  linkAuthUser: async (tripId: string, uid: string) => {
    await updateDoc(getTripRef(tripId), { memberUids: arrayUnion(uid) });
  },

  // --- FUNCIÓ ARREGLADA I RENOMBRADA PER AL MODAL ---
  linkUserToAccount: async (tripId: string, tripUserId: string, user: User) => {
    const tripRef = getTripRef(tripId);
    const snap = await getDoc(tripRef);
    if (!snap.exists()) throw new Error("Grup no trobat");
    
    const trip = snap.data() as TripData;
    const authUid = user.uid;
    const photoUrl = user.photoURL || null;

    // 1. Si aquest compte de Google ja estava vinculat a un altre perfil del grup, el desvinculem
    // (Per evitar duplicats si canvies de "personatge")
    const updatedUsers = trip.users.map(u => {
        if (u.linkedUid === authUid) return { ...u, linkedUid: null, isAuth: false, photoUrl: null };
        return u;
    });

    // 2. Vinculem el compte al perfil seleccionat
    const finalUsers = updatedUsers.map(u => {
        if (u.id === tripUserId) return { ...u, linkedUid: authUid, isAuth: true, photoUrl: photoUrl };
        return u;
    });

    await updateDoc(tripRef, { users: finalUsers, memberUids: arrayUnion(authUid) });
  },

  addUser: async (tripId: string, userName: string) => {
    const newUser: TripUser = { id: generateId(), name: userName };
    await updateDoc(getTripRef(tripId), { users: arrayUnion(newUser) });
  },

  // --- RENOMBRAT PER COINCIDIR AMB EL MODAL ---
  removeUserFromTrip: async (tripId: string, userId: string) => {
    const tripRef = getTripRef(tripId);
    const snap = await getDoc(tripRef);
    if (snap.exists()) {
        const trip = snap.data() as TripData;
        const newUsers = trip.users.filter(u => u.id !== userId);
        await updateDoc(tripRef, { users: newUsers });
    }
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
};