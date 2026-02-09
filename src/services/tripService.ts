// src/services/tripService.ts

import { 
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, setDoc, query, where, arrayUnion,
  FirestoreDataConverter, QueryDocumentSnapshot, SnapshotOptions 
} from 'firebase/firestore'; 
import { User } from 'firebase/auth';
import { db, appId, auth } from '../config/firebase';
import { Expense, TripData, Settlement, TripUser, LogEntry, Currency } from '../types';
import { ExpenseSchema } from '../utils/validation';

// --- CONVERTIDOR DE DADES (Seguretat de Tipus) ---
// Això garanteix que les dades que venen de Firebase sempre tenen l'estructura correcta,
// evitant errors "undefined" a la interfície si falten camps en viatges antics.
const tripConverter: FirestoreDataConverter<TripData> = {
  toFirestore: (trip: TripData) => {
    return {
      ...trip,
      // Assegurem que no guardem undefineds accidentals
      logs: trip.logs || [],
      memberUids: trip.memberUids || []
    };
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TripData => {
    const data = snapshot.data(options);
    return {
      id: snapshot.id.replace('trip_', ''), // Neteja de l'ID per consistència
      name: data.name || 'Viatge sense nom',
      users: data.users || [],
      expenses: data.expenses || [],
      currency: data.currency || { code: 'EUR', symbol: '€', locale: 'ca-ES' } as Currency,
      createdAt: data.createdAt || new Date().toISOString(),
      memberUids: data.memberUids || [],
      logs: data.logs || []
    };
  }
};

// --- REFERÈNCIES A COL·LECCIONS ---
// Apliquem el convertidor directament a les referències per tipat automàtic
const tripsCol = collection(db, 'artifacts', appId, 'public', 'data', 'trips').withConverter(tripConverter);

const getTripRef = (tripId: string) => 
  doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`).withConverter(tripConverter);

const getExpensesCol = (tripId: string) => 
  collection(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`, 'expenses');

const getExpenseRef = (tripId: string, expenseId: string) => 
  doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`, 'expenses', expenseId);

const generateId = () => crypto.randomUUID();

// --- SISTEMA DE LOGS INTERN ---
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
    // Nota: Utilitzem updateDoc directament per evitar re-escriure tot el document
    // El 'cast' parcial és necessari perquè estem actualitzant un camp específic
    await updateDoc(getTripRef(tripId), { logs: arrayUnion(log) } as any);
  } catch (e) { console.error("Error guardant log:", e); }
};

export const TripService = {
  getUserTrips: async (uid: string): Promise<TripData[]> => {
    try {
      // Ara 'tripsCol' ja té el convertidor, així que 'd.data()' retorna TripData directament
      const q = query(tripsCol, where('memberUids', 'array-contains', uid));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data());
    } catch (error) {
      console.error("Error obtenint viatges:", error);
      return [];
    }
  },

  createTrip: async (trip: TripData) => {
    // Utilitzem setDoc amb l'ID específic "trip_ID"
    // El convertidor s'encarregarà de preparar les dades
    await setDoc(getTripRef(trip.id), { ...trip, logs: [] });
  },

  updateTrip: async (tripId: string, data: Partial<TripData>) => {
    // updateDoc requereix objectes parcials, typescript es queixa si usem el convertidor estricte aquí
    // així que fem un update estàndard sobre la referència genèrica
    await updateDoc(getTripRef(tripId), data as any);
    await logAction(tripId, `ha actualitzat la configuració`, 'settings');
  },

  addExpense: async (tripId: string, expense: Omit<Expense, 'id'>) => {
    ExpenseSchema.parse(expense); // Validació Zod abans d'enviar
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

    // Fem servir arrayUnion per afegir atòmicament sense llegir/escriure tot el doc
    await updateDoc(tripRef, {
      users: arrayUnion(newUser),
      memberUids: arrayUnion(user.uid)
    } as any);

    await logAction(tripId, `s'ha unit al grup`, 'join');
  },

  leaveTrip: async (tripId: string, internalUserId: string) => {
    const tripRef = getTripRef(tripId);
    const snap = await getDoc(tripRef);
    if (!snap.exists()) return;
    
    const data = snap.data(); // Això ja és TripData gràcies al convertidor
    
    // Marquem l'usuari com esborrat (Soft Delete) per mantenir històric
    const newUsers = data.users.map(u => 
      u.id === internalUserId ? { ...u, isDeleted: true, linkedUid: undefined } : u
    );
    
    const newMembers = data.memberUids?.filter(uid => uid !== auth.currentUser?.uid) || [];
    
    await updateDoc(tripRef, { users: newUsers, memberUids: newMembers } as any);
    await logAction(tripId, `ha sortit del grup`, 'settings');
  }
};