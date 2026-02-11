// src/services/tripService.ts

import { 
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, setDoc, query, where, arrayUnion, arrayRemove,
  FirestoreDataConverter, QueryDocumentSnapshot, SnapshotOptions, UpdateData 
} from 'firebase/firestore'; 
import { User } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { DB_PATHS, TRIP_DOC_PREFIX } from '../config/dbPaths';
import { Expense, TripData, Settlement, TripUser, LogEntry, Currency } from '../types';
import { ExpenseSchema } from '../utils/validation';
import { calculateBalances } from './billingService'; // Importem la lògica de càlcul

// --- HELPER: SANITIZE DATA ---
const sanitizeData = <T>(data: T): T => {
  return JSON.parse(JSON.stringify(data));
};

// --- CONVERTIDOR DE DADES ---
const tripConverter: FirestoreDataConverter<TripData> = {
  toFirestore: (trip: TripData) => {
    const sanitized = sanitizeData(trip);
    return {
      ...sanitized,
      logs: sanitized.logs || [],
      memberUids: sanitized.memberUids || []
    };
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TripData => {
    const data = snapshot.data(options);
    return {
      id: snapshot.id.replace(TRIP_DOC_PREFIX, ''), 
      name: data.name || 'Viatge sense nom',
      users: data.users || [],
      expenses: data.expenses || [],
      currency: data.currency || { code: 'EUR', symbol: '€', locale: 'ca-ES' } as Currency,
      createdAt: data.createdAt || new Date().toISOString(),
      memberUids: data.memberUids || [],
      logs: data.logs || [],
      isDeleted: data.isDeleted || false, // Flag Soft Delete
      isSettled: data.isSettled || false   // Flag Saldat
    };
  }
};

const tripsCol = collection(db, DB_PATHS.TRIPS_COLLECTION).withConverter(tripConverter);

const getTripRef = (tripId: string) => 
  doc(db, DB_PATHS.getTripDocPath(tripId)).withConverter(tripConverter);

const getExpensesCol = (tripId: string) => 
  collection(db, DB_PATHS.getExpensesCollectionPath(tripId));

const getExpenseRef = (tripId: string, expenseId: string) => 
  doc(db, DB_PATHS.getExpenseDocPath(tripId, expenseId));

const generateId = () => crypto.randomUUID();

// --- FUNCIÓ AUXILIAR: RECALCULAR ESTAT SALDAT ---
// Aquesta funció es crida cada vegada que hi ha un canvi financer
const recalculateTripSettledStatus = async (tripId: string) => {
  try {
    // 1. Obtenim totes les despeses actuals
    const expensesSnap = await getDocs(getExpensesCol(tripId));
    const currentExpenses = expensesSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Expense[];

    // 2. Obtenim els usuaris (necessaris per al càlcul de balances)
    const tripSnap = await getDoc(getTripRef(tripId));
    if (!tripSnap.exists()) return;
    const tripData = tripSnap.data();

    // 3. Calculem els balanços
    const balances = calculateBalances(currentExpenses, tripData.users);

    // 4. Comprovem si TOTS els balanços són quasi zero (< 10 cèntims)
    const isSettled = balances.every(b => Math.abs(b.amount) < 10);

    // 5. Només actualitzem si l'estat ha canviat per estalviar escriptures
    if (tripData.isSettled !== isSettled) {
      await updateDoc(getTripRef(tripId), { isSettled });
      console.log(`[TripService] Estat 'isSettled' actualitzat a: ${isSettled}`);
    }

  } catch (error) {
    console.error("Error recalculant l'estat saldat:", error);
  }
};

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
    
    const updatePayload: UpdateData<TripData> = {
      logs: arrayUnion(sanitizeData(log))
    };
    
    await updateDoc(getTripRef(tripId), updatePayload);
  } catch (e) { console.error("Error guardant log:", e); }
};

export const TripService = {
  getUserTrips: async (uid: string): Promise<TripData[]> => {
    try {
      const q = query(tripsCol, where('memberUids', 'array-contains', uid));
      const snap = await getDocs(q);
      // FILTRE: Només retornem els que NO estan marcats com esborrats (SOFT DELETE)
      return snap.docs
        .map(d => d.data())
        .filter(trip => !trip.isDeleted); 
    } catch (error) {
      console.error("Error obtenint viatges:", error);
      return [];
    }
  },

  createTrip: async (trip: TripData) => {
    const initialMemberUids = trip.users
      .filter(u => u.linkedUid)
      .map(u => u.linkedUid as string);

    const tripWithMembers = {
      ...trip,
      memberUids: initialMemberUids,
      logs: [],
      isDeleted: false,
      isSettled: true // Un viatge nou comença saldat (0 despeses)
    };

    await setDoc(getTripRef(trip.id), sanitizeData(tripWithMembers));
  },

  updateTrip: async (tripId: string, data: Partial<TripData>) => {
    await updateDoc(getTripRef(tripId), sanitizeData(data) as UpdateData<TripData>);
    await logAction(tripId, `ha actualitzat la configuració`, 'settings');
  },

  // --- IMPLEMENTACIÓ SOFT DELETE ---
  deleteTrip: async (tripId: string) => {
    // No esborrem el document, només l'amaguem posant el flag isDeleted
    await updateDoc(getTripRef(tripId), { isDeleted: true });
    await logAction(tripId, `ha arxivat el projecte`, 'settings');
  },

  addExpense: async (tripId: string, expense: Omit<Expense, 'id'>) => {
    ExpenseSchema.parse(expense); 
    const cleanExpense = sanitizeData(expense);
    const docRef = await addDoc(getExpensesCol(tripId), cleanExpense);
    await logAction(tripId, `ha afegit "${expense.title}"`, 'create');
    
    // Recalculem l'estat global
    await recalculateTripSettledStatus(tripId);
    
    return docRef.id;
  },

  updateExpense: async (tripId: string, expenseId: string, expense: Partial<Expense>) => {
    await updateDoc(getExpenseRef(tripId, expenseId), sanitizeData(expense));
    await logAction(tripId, `ha editat "${expense.title || 'una despesa'}"`, 'update');
    
    // Recalculem l'estat global
    await recalculateTripSettledStatus(tripId);
  },

  deleteExpense: async (tripId: string, expenseId: string) => {
    const snap = await getDoc(getExpenseRef(tripId, expenseId));
    const title = snap.exists() ? snap.data().title : 'una despesa';
    await deleteDoc(getExpenseRef(tripId, expenseId));
    await logAction(tripId, `ha eliminat "${title}"`, 'delete');

    // Recalculem l'estat global
    await recalculateTripSettledStatus(tripId);
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
    await addDoc(getExpensesCol(tripId), sanitizeData(repayment));
    await logAction(tripId, `ha liquidat un deute via ${method}`, 'settle');

    // Recalculem l'estat global (essencial aquí, ja que busquem que isSettled sigui true)
    await recalculateTripSettledStatus(tripId);
  },

  joinTripViaLink: async (tripId: string, user: User) => {
    const tripRef = getTripRef(tripId);
    const tripSnap = await getDoc(tripRef);
    if (!tripSnap.exists()) return;

    const data = tripSnap.data();
    if (data.isDeleted) return; // No es pot unir a viatges arxivats

    const currentUsers = data.users || [];
    const alreadyExists = currentUsers.some(u => u.linkedUid === user.uid);

    if (alreadyExists) {
      if (data.memberUids && !data.memberUids.includes(user.uid)) {
        await updateDoc(tripRef, { memberUids: arrayUnion(user.uid) });
      }
      return;
    }

    const newUser: TripUser = {
      id: generateId(),
      name: user.displayName || user.email?.split('@')[0] || 'Usuari',
      linkedUid: user.uid,
      isAuth: true,
      isDeleted: false,
      photoUrl: user.photoURL || null
    };

    await updateDoc(tripRef, {
      users: arrayUnion(sanitizeData(newUser)),
      memberUids: arrayUnion(user.uid)
    });
    
    // Quan s'uneix algú nou, el balanç no canvia (té 0), així que no cal recalcular isSettled
    await logAction(tripId, `s'ha unit al grup`, 'join');
  },

  updateTripUserName: async (tripId: string, userId: string, newName: string) => {
    const tripRef = getTripRef(tripId); 
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) throw new Error("El viatge no existeix");

    const tripData = tripSnap.data(); 

    const updatedUsers = tripData.users.map(u => {
      if (u.id === userId) {
        return { ...u, name: newName.trim() };
      }
      return u;
    });

    await updateDoc(tripRef, { users: updatedUsers });
    await logAction(tripId, `ha canviat el nom d'un participant`, 'settings');
  },

  leaveTrip: async (tripId: string, internalUserId: string) => {
    const tripRef = getTripRef(tripId);
    const snap = await getDoc(tripRef);
    if (!snap.exists()) return;
    
    const data = snap.data(); 
    
    const newUsers = data.users.filter(u => u.id !== internalUserId);
    const userToRemove = data.users.find(u => u.id === internalUserId);
    const uidToRemove = userToRemove?.linkedUid;

    const updatePayload: UpdateData<TripData> = { 
      users: newUsers
    };

    if (uidToRemove) {
      updatePayload.memberUids = arrayRemove(uidToRemove);
    }

    await updateDoc(tripRef, updatePayload);
    await logAction(tripId, `ha sortit del grup`, 'settings');
    
    // Recalculem per si de cas, tot i que s'hauria d'haver bloquejat abans si tenia deute
    await recalculateTripSettledStatus(tripId);
  }
};