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

// --- HELPER: SANITIZE DATA (RISC ZERO PER A FIRESTORE) ---
// Elimina claus amb valor undefined per evitar errors de Firestore
const sanitizeData = <T>(data: T): T => {
  return JSON.parse(JSON.stringify(data));
};

// --- CONVERTIDOR DE DADES (Seguretat de Tipus) ---
const tripConverter: FirestoreDataConverter<TripData> = {
  toFirestore: (trip: TripData) => {
    // Sanatitzem abans d'enviar per evitar errors de camps opcionals undefined
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
      logs: data.logs || []
    };
  }
};

// --- REFERÈNCIES A COL·LECCIONS ---
const tripsCol = collection(db, DB_PATHS.TRIPS_COLLECTION).withConverter(tripConverter);

const getTripRef = (tripId: string) => 
  doc(db, DB_PATHS.getTripDocPath(tripId)).withConverter(tripConverter);

const getExpensesCol = (tripId: string) => 
  collection(db, DB_PATHS.getExpensesCollectionPath(tripId));

const getExpenseRef = (tripId: string, expenseId: string) => 
  doc(db, DB_PATHS.getExpenseDocPath(tripId, expenseId));

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
    
    // Sanatitzem el log també
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
      return snap.docs.map(d => d.data());
    } catch (error) {
      console.error("Error obtenint viatges:", error);
      return [];
    }
  },

  createTrip: async (trip: TripData) => {
    // 1. Assegurar memberUids des de l'inici
    const initialMemberUids = trip.users
      .filter(u => u.linkedUid)
      .map(u => u.linkedUid as string);

    // 2. Preparar objecte complert
    const tripWithMembers = {
      ...trip,
      memberUids: initialMemberUids,
      logs: []
    };

    // 3. Guardar amb sanatització
    await setDoc(getTripRef(trip.id), sanitizeData(tripWithMembers));
  },

  updateTrip: async (tripId: string, data: Partial<TripData>) => {
    await updateDoc(getTripRef(tripId), sanitizeData(data) as UpdateData<TripData>);
    await logAction(tripId, `ha actualitzat la configuració`, 'settings');
  },

  addExpense: async (tripId: string, expense: Omit<Expense, 'id'>) => {
    ExpenseSchema.parse(expense); 
    const cleanExpense = sanitizeData(expense);
    const docRef = await addDoc(getExpensesCol(tripId), cleanExpense);
    await logAction(tripId, `ha afegit "${expense.title}"`, 'create');
    return docRef.id;
  },

  updateExpense: async (tripId: string, expenseId: string, expense: Partial<Expense>) => {
    await updateDoc(getExpenseRef(tripId, expenseId), sanitizeData(expense));
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
    await addDoc(getExpensesCol(tripId), sanitizeData(repayment));
    await logAction(tripId, `ha liquidat un deute via ${method}`, 'settle');
  },

  joinTripViaLink: async (tripId: string, user: User) => {
    const tripRef = getTripRef(tripId);
    
    // 1. LLEGIR: Obtenim l'estat actual abans de tocar res
    const tripSnap = await getDoc(tripRef);
    if (!tripSnap.exists()) return;

    const data = tripSnap.data();
    const currentUsers = data.users || [];
    
    // 2. CHECK DE SEGURETAT (IDEMPOTÈNCIA)
    // Busquem si JA existeix un usuari amb aquest UID de Firebase (linkedUid)
    const alreadyExists = currentUsers.some(u => u.linkedUid === user.uid);

    if (alreadyExists) {
      console.log("TripService: L'usuari ja existeix. No fem res.");
      
      // Opcional: Si l'usuari existeix però per error no era a memberUids, ho arreglem
      if (data.memberUids && !data.memberUids.includes(user.uid)) {
        await updateDoc(tripRef, { memberUids: arrayUnion(user.uid) });
      }
      return; // <--- SORTIM AQUÍ
    }

    // 3. NOMÉS SI NO EXISTEIX, CREEM L'USUARI
    const newUser: TripUser = {
      id: generateId(),
      name: user.displayName || user.email?.split('@')[0] || 'Usuari',
      linkedUid: user.uid,
      isAuth: true,
      isDeleted: false,
      photoUrl: user.photoURL || null // Assegurar null si és undefined
    };

    await updateDoc(tripRef, {
      users: arrayUnion(sanitizeData(newUser)),
      memberUids: arrayUnion(user.uid)
    });
    
    await logAction(tripId, `s'ha unit al grup`, 'join');
  },

  // --- ACTUALITZAR NOM D'UN USUARI ---
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
    
    // 1. FILTRAR l'usuari de l'array d'usuaris (ELIMINAR OBJECTE)
    const newUsers = data.users.filter(u => u.id !== internalUserId);
    
    // 2. Obtenir el UID de Firebase per treure'l de memberUids
    const userToRemove = data.users.find(u => u.id === internalUserId);
    const uidToRemove = userToRemove?.linkedUid;

    // 3. Construir payload
    const updatePayload: UpdateData<TripData> = { 
      users: newUsers
    };

    // Si tenia UID vinculat, el treiem de l'array de seguretat amb arrayRemove
    if (uidToRemove) {
      updatePayload.memberUids = arrayRemove(uidToRemove);
    }

    await updateDoc(tripRef, updatePayload);
    await logAction(tripId, `ha sortit del grup`, 'settings');
  }
};