import { 
  collection, doc, addDoc, updateDoc, deleteDoc, setDoc, 
  arrayUnion, arrayRemove, query, where, getDocs, getDoc
} from 'firebase/firestore';
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

  // 1. Aquesta és la funció per ABANDONAR el grup
  leaveTrip: async (tripId: string, userId: string) => {
    await updateDoc(getTripRef(tripId), { memberUids: arrayRemove(userId) });
  },

  // 2. Aquesta és la funció que faltava per UNIR-SE automàticament
  linkAuthUser: async (tripId: string, uid: string) => {
    await updateDoc(getTripRef(tripId), { memberUids: arrayUnion(uid) });
  },

  // 3. Aquesta és per VINCULAR el perfil ("Sóc jo")
  linkUserToProfile: async (tripId: string, tripUserId: string, authUid: string, photoUrl?: string | null) => {
    const tripRef = getTripRef(tripId);
    const snap = await getDoc(tripRef);
    if (!snap.exists()) throw new Error("Grup no trobat");
    
    const trip = snap.data() as TripData;
    const updatedUsers = trip.users.map(u => {
        if (u.linkedUid === authUid) return { ...u, linkedUid: undefined, isAuth: false, photoUrl: undefined };
        return u;
    });

    const finalUsers = updatedUsers.map(u => {
        if (u.id === tripUserId) return { ...u, linkedUid: authUid, isAuth: true, photoUrl: photoUrl || undefined };
        return u;
    });

    await updateDoc(tripRef, { users: finalUsers, memberUids: arrayUnion(authUid) });
  },

  addUser: async (tripId: string, userName: string) => {
    const newUser: TripUser = { id: generateId(), name: userName };
    await updateDoc(getTripRef(tripId), { users: arrayUnion(newUser) });
  },

  removeUser: async (tripId: string, userId: string) => {
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