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
import { calculateBalances } from './billingService'; 

// --- HELPER: SANITIZE DATA ---
const sanitizeData = <T>(data: T): T => {
  if (data === null || typeof data !== 'object') return data;
  if (data instanceof Date) return data.toISOString() as unknown as T;
  if (Array.isArray(data)) return data.map(sanitizeData) as unknown as T;
  
  const sanitized = {} as Record<string, any>;
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      sanitized[key] = sanitizeData(value);
    }
  }
  return sanitized as T;
};

// --- CONVERTIDOR DE DADES ---
const tripConverter: FirestoreDataConverter<TripData> = {
  toFirestore: (trip: TripData) => {
    const sanitized = sanitizeData(trip);
    return {
      ...sanitized,
      logs: sanitized.logs || [],
      memberUids: sanitized.memberUids || [],
      ownerId: sanitized.ownerId || null
    };
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TripData => {
    const data = snapshot.data(options);
    return {
      id: snapshot.id.replace(TRIP_DOC_PREFIX, ''), 
      name: data.name || 'Viatge sense nom',
      users: data.users || [],
      expenses: data.expenses || [],
      currency: data.currency || { code: 'EUR', symbol: '€', locale: 'ca-ES', name: 'Euro' } as Currency,
      createdAt: data.createdAt || new Date().toISOString(),
      memberUids: data.memberUids || [],
      ownerId: data.ownerId,
      logs: data.logs || [],
      isDeleted: data.isDeleted || false,
      isSettled: data.isSettled || false
    };
  }
};

const tripsCol = collection(db, DB_PATHS.TRIPS_COLLECTION).withConverter(tripConverter);

const getTripRef = (tripId: string) => {
  if (!tripId) throw new Error("ID de viatge invàlid");
  return doc(db, DB_PATHS.getTripDocPath(tripId)).withConverter(tripConverter);
}

const getExpensesCol = (tripId: string) => 
  collection(db, DB_PATHS.getExpensesCollectionPath(tripId));

const getExpenseRef = (tripId: string, expenseId: string) => 
  doc(db, DB_PATHS.getExpenseDocPath(tripId, expenseId));

const generateId = () => crypto.randomUUID();

const recalculateTripSettledStatus = async (tripId: string) => {
  try {
    const expensesSnap = await getDocs(getExpensesCol(tripId));
    const currentExpenses = expensesSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Expense[];
    const tripSnap = await getDoc(getTripRef(tripId));
    if (!tripSnap.exists()) return;
    const tripData = tripSnap.data();
    const balances = calculateBalances(currentExpenses, tripData.users);
    const isSettled = balances.every(b => Math.abs(b.amount) < 10);

    if (tripData.isSettled !== isSettled) {
      await updateDoc(getTripRef(tripId), { isSettled });
    }
  } catch (error) {
    console.error("Error recalculant l'estat saldat:", error);
  }
};

const logAction = async (tripId: string, message: string, action: LogEntry['action']) => {
  try {
    const currentUser = auth.currentUser;
    let finalUserName = currentUser?.displayName || 'Algú';

    // [RISC ZERO]: Anem a buscar el nom personalitzat de l'usuari DINS d'aquest viatge.
    // Així, si es canvia el nom a "Joan", el registre farà servir "Joan" i no el seu Google/Email alias.
    if (currentUser) {
        const tripSnap = await getDoc(getTripRef(tripId));
        if (tripSnap.exists()) {
            const tripData = tripSnap.data();
            const matchedUser = tripData.users.find((u: TripUser) => u.linkedUid === currentUser.uid);
            if (matchedUser && matchedUser.name) {
                finalUserName = matchedUser.name;
            }
        }
    }

    const log: LogEntry = {
      id: generateId(),
      action,
      message,
      userId: currentUser?.uid || 'anonymous',
      userName: finalUserName,
      timestamp: new Date().toISOString()
    };
    
    const updatePayload: UpdateData<TripData> = { logs: arrayUnion(sanitizeData(log)) };
    await updateDoc(getTripRef(tripId), updatePayload);
  } catch (e) { 
      console.error("Error guardant log:", e); 
  }
};

export const TripService = {
  getUserTrips: async (uid: string): Promise<TripData[]> => {
    try {
      const q = query(tripsCol, where('memberUids', 'array-contains', uid));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data()).filter(trip => !trip.isDeleted); 
    } catch (error) {
      console.error("Error obtenint viatges:", error);
      return [];
    }
  },

  getTripExpenses: async (tripId: string): Promise<Expense[]> => {
    try {
      const snap = await getDocs(getExpensesCol(tripId));
      return snap.docs.map(d => ({ ...d.data(), id: d.id })) as Expense[];
    } catch (error) {
      console.error("Error obtenint despeses:", error);
      return [];
    }
  },

  createTrip: async (trip: TripData) => {
    const initialMemberUids = trip.users.filter(u => u.linkedUid).map(u => u.linkedUid as string);
    const tripWithMembers = {
      ...trip,
      memberUids: initialMemberUids,
      ownerId: auth.currentUser?.uid, 
      logs: [],
      isDeleted: false,
      isSettled: true 
    };
    await setDoc(getTripRef(trip.id), sanitizeData(tripWithMembers));
  },

  updateTrip: async (tripId: string, data: Partial<TripData>) => {
    await updateDoc(getTripRef(tripId), sanitizeData(data) as UpdateData<TripData>);
    await logAction(tripId, `ha actualitzat la configuració`, 'settings');
  },

  deleteTrip: async (tripId: string) => {
    await updateDoc(getTripRef(tripId), { isDeleted: true });
    await logAction(tripId, `ha arxivat el projecte`, 'settings');
  },

  addExpense: async (tripId: string, expense: Omit<Expense, 'id'>) => {
    ExpenseSchema.parse(expense); 
    const cleanExpense = sanitizeData(expense);
    const docRef = await addDoc(getExpensesCol(tripId), cleanExpense);
    
    // [NOU DETALL]: Formatem l'import per mostrar-lo al registre
    const formattedAmount = (expense.amount / 100).toFixed(2).replace('.', ',');
    await logAction(tripId, `ha afegit la despesa "${expense.title}" de ${formattedAmount} €`, 'create');
    
    await recalculateTripSettledStatus(tripId);
    return docRef.id;
  },

  updateExpense: async (tripId: string, expenseId: string, expense: Partial<Expense>) => {
    await updateDoc(getExpenseRef(tripId, expenseId), sanitizeData(expense));
    
    let detail = '';
    if (expense.amount) {
        detail = ` (nou import: ${(expense.amount / 100).toFixed(2).replace('.', ',')} €)`;
    }
    
    await logAction(tripId, `ha modificat la despesa "${expense.title || 'sense nom'}"${detail}`, 'update');
    await recalculateTripSettledStatus(tripId);
  },

  deleteExpense: async (tripId: string, expenseId: string) => {
    const snap = await getDoc(getExpenseRef(tripId, expenseId));
    let title = 'una despesa';
    let amountDetail = '';
    
    // [NOU DETALL]: Llegim l'import abans d'esborrar per guardar-ho a l'historial
    if (snap.exists()) {
        const data = snap.data();
        title = data.title || title;
        if (data.amount) {
            amountDetail = ` de ${(data.amount / 100).toFixed(2).replace('.', ',')} €`;
        }
    }
    
    await deleteDoc(getExpenseRef(tripId, expenseId));
    await logAction(tripId, `ha eliminat la despesa "${title}"${amountDetail}`, 'delete');
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
    
    // [NOU DETALL]: Indiquem la quantitat exacte liquidada
    const formattedAmount = (settlement.amount / 100).toFixed(2).replace('.', ',');
    await logAction(tripId, `ha liquidat un deute de ${formattedAmount} € via ${method}`, 'settle');
    
    await recalculateTripSettledStatus(tripId);
  },

  joinTripViaLink: async (tripId: string, user: User) => {
    const tripRef = getTripRef(tripId);
    const tripSnap = await getDoc(tripRef);
    if (!tripSnap.exists()) return;

    const data = tripSnap.data();
    if (data.isDeleted) return;

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
    await logAction(tripId, `s'ha unit al grup`, 'join');
  },

  updateTripUserName: async (tripId: string, userId: string, newName: string) => {
    if (!tripId) throw new Error("ID de viatge no vàlid");
    const tripRef = getTripRef(tripId); 
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) throw new Error("El viatge no existeix");

    const tripData = tripSnap.data(); 

    const updatedUsers = tripData.users.map(u => {
      if (u.id === userId) {
        return { ...u, name: newName, photoUrl: null };
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
    
    const userIndex = data.users.findIndex((u: TripUser) => u.id === internalUserId);
    if (userIndex === -1) return;

    const userToRemove = data.users[userIndex];
    const uidToRemove = userToRemove.linkedUid;

    await recalculateTripSettledStatus(tripId);

    const updatedUsers = [...data.users];
    updatedUsers[userIndex] = {
        ...userToRemove,
        linkedUid: null,      
        isAuth: false,        
        name: `${userToRemove.name} (Ha sortit)` 
    };

    const currentUser = auth.currentUser;
    const newLog: LogEntry = {
      id: generateId(),
      action: 'settings',
      message: `ha sortit del grup`,
      userId: currentUser?.uid || internalUserId,
      userName: userToRemove.name || currentUser?.displayName || 'Algú',
      timestamp: new Date().toISOString()
    };

    // [ESCRIPTURA ATÒMICA]: Empaquetem la modificació d'usuaris, 
    // l'afegiment del log i l'expulsió a memberUids en una SOLA transacció.
    const updatePayload: UpdateData<TripData> = { 
      users: updatedUsers,
      logs: arrayUnion(sanitizeData(newLog))
    };
    
    if (uidToRemove) {
      updatePayload.memberUids = arrayRemove(uidToRemove);
    }

    await updateDoc(tripRef, updatePayload);
  },

  linkUserToAccount: async (tripId: string, tripUserId: string, user: User) => {
    const tripRef = getTripRef(tripId);
    const tripSnap = await getDoc(tripRef);
    if (!tripSnap.exists()) throw new Error("Viatge no trobat");

    const data = tripSnap.data();
    const updatedUsers = data.users.map(u => {
      if (u.id === tripUserId) {
        return { ...u, linkedUid: user.uid, photoUrl: user.photoURL || null, isAuth: true };
      }
      return u;
    });

    await updateDoc(tripRef, {
      users: updatedUsers,
      memberUids: arrayUnion(user.uid)
    });
    await logAction(tripId, `ha reclamat un perfil`, 'join');
  }
};