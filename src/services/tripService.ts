import { 
  collection, doc, addDoc, updateDoc, deleteDoc, setDoc, 
  arrayUnion, arrayRemove, query, where, getDocs, getDoc 
} from 'firebase/firestore'; 
import { User } from 'firebase/auth';
import { db, appId, auth } from '../config/firebase';
import { Expense, TripData, Settlement, TripUser, LogEntry } from '../types';
import { ExpenseSchema, TripDataSchema, TripUserSchema } from '../utils/validation';

const getTripRef = (tripId: string) => doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`);
const getExpensesCol = (tripId: string) => collection(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`, 'expenses');
const getExpenseRef = (tripId: string, expenseId: string) => doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`, 'expenses', expenseId);

const generateId = () => crypto.randomUUID();

const logAction = async (tripId: string, message: string, action: LogEntry['action']) => {
  try {
    const currentUser = auth.currentUser;
    const userName = currentUser?.displayName || 'Algú';
    const userId = currentUser?.uid || 'anonymous';

    const log: LogEntry = {
      id: generateId(),
      action,
      message,
      userId,
      userName,
      timestamp: new Date().toISOString()
    };

    await updateDoc(getTripRef(tripId), {
      logs: arrayUnion(log)
    });
  } catch (e) {
    console.warn("No s'ha pogut guardar el log:", e);
  }
};

export const TripService = {
  createTrip: async (trip: TripData) => {
    const validatedTrip = TripDataSchema.parse(trip);
    validatedTrip.logs = [];
    // Assegurem que no hi hagi undefineds fent una neteja ràpida
    const cleanTrip = JSON.parse(JSON.stringify(validatedTrip));
    await setDoc(getTripRef(cleanTrip.id), cleanTrip);
  },

  getUserTrips: async (userId: string) => {
    const tripsRef = collection(db, 'artifacts', appId, 'public', 'data', 'trips');
    const q = query(tripsRef, where('memberUids', 'array-contains', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as TripData);
  },

  updateTrip: async (tripId: string, data: Partial<TripData>) => {
    await updateDoc(getTripRef(tripId), data);
    if (data.name || data.currency) {
      await logAction(tripId, "Ha actualitzat la configuració del grup", 'settings');
    }
  },

  joinTripViaLink: async (tripId: string, user: User) => {
    const tripRef = getTripRef(tripId);
    const snap = await getDoc(tripRef);
    if (!snap.exists()) throw new Error("El grup no existeix");
    
    const trip = snap.data() as TripData;
    if (trip.memberUids?.includes(user.uid)) return;

    const existingProfileIndex = trip.users.findIndex(u => u.linkedUid === user.uid);
    
    if (existingProfileIndex === -1) {
        // CORRECCIÓ AQUÍ: Evitem 'undefined' usant spread operator condicional
        const newTripUser: TripUser = {
            id: generateId(),
            name: user.displayName || 'Anònim',
            isAuth: true,
            linkedUid: user.uid,
            isDeleted: false,
            ...(user.email ? { email: user.email } : {}),
            ...(user.photoURL ? { photoUrl: user.photoURL } : {})
        };
        
        // Validem, però ja sabem que no té undefineds
        TripUserSchema.parse(newTripUser);

        await updateDoc(tripRef, {
            users: arrayUnion(newTripUser),
            memberUids: arrayUnion(user.uid)
        });
        await logAction(tripId, `${newTripUser.name} s'ha unit al grup`, 'join');
    } else {
        await updateDoc(tripRef, { memberUids: arrayUnion(user.uid) });
    }
  },

  leaveTrip: async (tripId: string, userIdToRemove: string) => {
    const tripRef = getTripRef(tripId);
    const snap = await getDoc(tripRef);
    
    if (snap.exists()) {
        const trip = snap.data() as TripData;
        const userObj = trip.users.find(u => u.id === userIdToRemove);
        if (!userObj) return;

        try {
            const currentUser = auth.currentUser;
            const log: LogEntry = {
                id: generateId(),
                action: 'join',
                message: `${userObj.name} ha marxat del grup`,
                userId: currentUser?.uid || 'anonymous',
                userName: userObj.name,
                timestamp: new Date().toISOString()
            };
            await updateDoc(tripRef, { logs: arrayUnion(log) });
        } catch (e) {
            console.warn("No s'ha pogut guardar el log de sortida", e);
        }

        const hasHistory = trip.expenses.some(e => e.payer === userIdToRemove || e.involved.includes(userIdToRemove));
        const authUidToRemove = userObj.linkedUid;

        if (hasHistory) {
            const updatedUsers = trip.users.map(u => {
                if (u.id === userIdToRemove) {
                    return { ...u, linkedUid: null, isAuth: false, photoUrl: undefined, name: `${u.name} (Ex-membre)`, isDeleted: true };
                }
                return u;
            });
            
            // neteja undefineds abans d'enviar
            const cleanUsers = JSON.parse(JSON.stringify(updatedUsers));
            const updates: any = { users: cleanUsers };
            if (authUidToRemove) updates.memberUids = arrayRemove(authUidToRemove);
            
            await updateDoc(tripRef, updates);

        } else {
            const newUsers = trip.users.filter(u => u.id !== userIdToRemove);
            const updates: any = { users: newUsers };
            if (authUidToRemove) updates.memberUids = arrayRemove(authUidToRemove);
            
            await updateDoc(tripRef, updates);
        }
    }
  },

  linkAuthUser: async (tripId: string, uid: string) => {
    await updateDoc(getTripRef(tripId), { memberUids: arrayUnion(uid) });
  },

  linkUserToAccount: async (tripId: string, tripUserId: string, user: User) => {
    const tripRef = getTripRef(tripId);
    const snap = await getDoc(tripRef);
    if (!snap.exists()) throw new Error("Grup no trobat");
    
    const trip = snap.data() as TripData;
    const authUid = user.uid;
    // Evitem undefined a photoUrl
    const photoUrl = user.photoURL || null; 

    const updatedUsers = trip.users.map(u => {
        if (u.linkedUid === authUid) return { ...u, linkedUid: null, isAuth: false, photoUrl: undefined };
        return u;
    });

    const finalUsers = updatedUsers.map(u => {
        if (u.id === tripUserId) return { ...u, linkedUid: authUid, isAuth: true, photoUrl: photoUrl || undefined, isDeleted: false };
        return u;
    });

    // Neteja final per seguretat
    const cleanUsers = JSON.parse(JSON.stringify(finalUsers));
    await updateDoc(tripRef, { users: cleanUsers, memberUids: arrayUnion(authUid) });
    await logAction(tripId, `${user.displayName} ha reclamat el perfil`, 'join');
  },

  addUser: async (tripId: string, userName: string) => {
    if (!userName.trim()) throw new Error("El nom no pot estar buit");
    const newUser: TripUser = { id: generateId(), name: userName.trim(), isDeleted: false };
    TripUserSchema.parse(newUser);
    await updateDoc(getTripRef(tripId), { users: arrayUnion(newUser) });
    await logAction(tripId, `Ha afegit el membre "${userName}"`, 'settings');
  },

  renameUser: async (tripId: string, userId: string, newName: string) => {
    if (!newName.trim()) throw new Error("El nom no pot estar buit");
    const tripRef = getTripRef(tripId);
    const snap = await getDoc(tripRef);
    if (!snap.exists()) throw new Error("Grup no trobat");
    const trip = snap.data() as TripData;
    const updatedUsers = trip.users.map(u => u.id === userId ? { ...u, name: newName.trim() } : u);
    await updateDoc(tripRef, { users: updatedUsers });
  },

  addExpense: async (tripId: string, expense: Omit<Expense, 'id'>) => {
    ExpenseSchema.parse(expense);
    await addDoc(getExpensesCol(tripId), expense);
    await logAction(tripId, `Ha creat la despesa "${expense.title}" de ${(expense.amount / 100).toFixed(2)}€`, 'create');
  },

  updateExpense: async (tripId: string, expenseId: string, expense: Partial<Expense>) => {
    if (expense.amount !== undefined && expense.amount <= 0) throw new Error("L'import ha de ser positiu");
    if (expense.title !== undefined && !expense.title.trim()) throw new Error("El títol no pot estar buit");
    
    await updateDoc(getExpenseRef(tripId, expenseId), expense);
    await logAction(tripId, `Ha editat la despesa "${expense.title || 'existente'}"`, 'update');
  },

  deleteExpense: async (tripId: string, expenseId: string) => {
    await deleteDoc(getExpenseRef(tripId, expenseId));
    await logAction(tripId, `Ha eliminat una despesa`, 'delete');
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
    
    ExpenseSchema.parse(repayment);
    await addDoc(getExpensesCol(tripId), repayment);
    await logAction(tripId, `Ha liquidat ${(settlement.amount / 100).toFixed(2)}€ via ${method}`, 'settle');
  },

  removeMemberAccess: async (tripId: string, authUid: string) => {
    const tripRef = getTripRef(tripId);
    await updateDoc(tripRef, { memberUids: arrayRemove(authUid) });
  },
};