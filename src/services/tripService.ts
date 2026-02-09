import { 
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, arrayUnion 
} from 'firebase/firestore'; 
import { User } from 'firebase/auth';
import { db, appId, auth } from '../config/firebase';
import { Expense, TripData, Settlement, TripUser, LogEntry } from '../types';
import { ExpenseSchema } from '../utils/validation';

const tripsCol = collection(db, 'artifacts', appId, 'public', 'data', 'trips');
const getTripRef = (tripId: string) => doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`);
const getExpensesCol = (tripId: string) => collection(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`, 'expenses');
const getExpenseRef = (tripId: string, expenseId: string) => doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`, 'expenses', expenseId);

const generateId = () => crypto.randomUUID();

const logAction = async (tripId: string, message: string, action: LogEntry['action']) => {
  try {
    const currentUser = auth.currentUser;
    const log: LogEntry = {
      id: generateId(),
      action,
      message,
      userId: currentUser?.uid || 'anonymous',
      userName: currentUser?.displayName || 'Algú',
      timestamp: new Date().toISOString()
    };
    await updateDoc(getTripRef(tripId), { logs: arrayUnion(log) });
  } catch (e) { console.error("Error log:", e); }
};

export const TripService = {
  getUserTrips: async (uid: string): Promise<TripData[]> => {
    const q = query(tripsCol, where('memberUids', 'array-contains', uid));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id.replace('trip_', '') } as TripData));
  },

  createTrip: async (trip: TripData) => {
    await setDoc(getTripRef(trip.id), { ...trip, logs: [] });
  },

  updateTrip: async (tripId: string, data: Partial<TripData>) => {
    await updateDoc(getTripRef(tripId), data);
    await logAction(tripId, `ha actualitzat la configuració`, 'settings');
  },

  addExpense: async (tripId: string, expense: Omit<Expense, 'id'>) => {
    ExpenseSchema.parse(expense);
    const docRef = await addDoc(getExpensesCol(tripId), expense);
    await logAction(tripId, `ha afegit "${expense.title}"`, 'create');
    return docRef.id;
  },

  updateExpense: async (tripId: string, expenseId: string, expense: Partial<Expense>) => {
    await updateDoc(getExpenseRef(tripId, expenseId), expense);
    await logAction(tripId, `ha editat "${expense.title || 'una despesa'}"`, 'update');
  },

  deleteExpense: async (tripId: string, expenseId: string) => {
    const snap = await getDoc(getExpenseRef(tripId, expenseId));
    const title = snap.exists() ? snap.data().title : 'una despesa';
    await deleteDoc(getExpenseRef(tripId, expenseId));
    await logAction(tripId, `ha eliminat "${title}"`, 'delete');
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
    await logAction(tripId, `ha liquidat un deute via ${method}`, 'settle');
  },

  joinTripViaLink: async (tripId: string, user: User) => {
    const tripRef = getTripRef(tripId);
    const newUser: TripUser = {
      id: generateId(),
      name: user.displayName || user.email?.split('@')[0] || 'Usuari',
      linkedUid: user.uid,
      isAuth: true,
      isDeleted: false,
      photoUrl: user.photoURL || undefined
    };
    await updateDoc(tripRef, {
      users: arrayUnion(newUser),
      memberUids: arrayUnion(user.uid)
    });
    await logAction(tripId, `s'ha unit al grup`, 'join');
  },

  leaveTrip: async (tripId: string, internalUserId: string) => {
    const tripRef = getTripRef(tripId);
    const snap = await getDoc(tripRef);
    if (!snap.exists()) return;
    const data = snap.data() as TripData;
    const newUsers = data.users.map(u => u.id === internalUserId ? { ...u, isDeleted: true, linkedUid: null } : u);
    const newMembers = data.memberUids.filter(uid => uid !== auth.currentUser?.uid);
    await updateDoc(tripRef, { users: newUsers, memberUids: newMembers });
    await logAction(tripId, `ha sortit del grup`, 'settings');
  }
};