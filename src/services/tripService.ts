// src/services/tripService.ts

import { 
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, setDoc, query, where, arrayUnion,
  FirestoreDataConverter, QueryDocumentSnapshot, SnapshotOptions, UpdateData 
} from 'firebase/firestore'; 
import { User } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { DB_PATHS, TRIP_DOC_PREFIX } from '../config/dbPaths';
import { Expense, TripData, Settlement, TripUser, LogEntry, Currency } from '../types';
import { ExpenseSchema } from '../utils/validation';
import { calculateBalances } from './billingService'; // <-- [AFEGIT]: Importem la funció per recalcular balanços

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

const logAction = async (tripId: string, message: string, action: LogEntry['action']) => {
  try {
    const currentUser = auth.currentUser;
    let finalUserName = currentUser?.displayName || 'Algú';

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

// --- [AFEGIT]: MOTOR DE SINCRONITZACIÓ DE SALDOS ---
const syncTripSettledState = async (tripId: string) => {
  try {
    const tripSnap = await getDoc(getTripRef(tripId));
    if (!tripSnap.exists()) return;
    
    const tripData = tripSnap.data();
    const expensesSnap = await getDocs(getExpensesCol(tripId));
    const expenses = expensesSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Expense[];
    
    const balances = calculateBalances(expenses, tripData.users);
    
    // Considerem que està saldat si el balanç de tothom està entre -1 i 1 cèntim (marge d'arrodoniments)
    const isSettledNow = balances.every(b => Math.abs(Number(b.amount)) < 2);
    
    if (tripData.isSettled !== isSettledNow) {
      await updateDoc(getTripRef(tripId), { isSettled: isSettledNow });
    }
  } catch (error) {
    console.error("Error sincronitzant l'estat Saldat:", error);
  }
};

export const TripService = {
  getTrip: async (tripId: string): Promise<TripData | null> => {
    try {
      const snap = await getDoc(getTripRef(tripId));
      return snap.exists() ? snap.data() : null;
    } catch (error) {
      console.error("Error obtenint el viatge:", error);
      return null;
    }
  },

  getUserTrips: async (uid: string): Promise<TripData[]> => {
    try {
      const q = query(tripsCol, where('memberUids', 'array-contains', uid));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data()).filter(trip => !trip.isDeleted); 
    } catch (error) {
      console.error("Error obtenint viatges:", error);
      throw new Error("No s'han pogut carregar els viatges. Comprova la teva connexió.");
    }
  },

  getTripExpenses: async (tripId: string): Promise<Expense[]> => {
    try {
      const snap = await getDocs(getExpensesCol(tripId));
      return snap.docs.map(d => ({ ...d.data(), id: d.id })) as Expense[];
    } catch (error) {
      console.error("Error obtenint despeses:", error);
      throw new Error("No s'han pogut carregar les despeses del viatge.");
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

  // Funció silenciosa per actualitzar només l'estat sense disparar logs
  updateTripSettledState: async (tripId: string, isSettled: boolean) => {
    await updateDoc(getTripRef(tripId), { isSettled });
  },

  deleteTrip: async (tripId: string) => {
    await updateDoc(getTripRef(tripId), { isDeleted: true });
    await logAction(tripId, `ha arxivat el projecte`, 'settings');
  },

  addExpense: async (tripId: string, expense: Omit<Expense, 'id'>) => {
    ExpenseSchema.parse(expense); 
    const cleanExpense = sanitizeData(expense);
    const docRef = await addDoc(getExpensesCol(tripId), cleanExpense);
    
    const formattedAmount = (expense.amount / 100).toFixed(2).replace('.', ',');
    await logAction(tripId, `ha afegit la despesa "${expense.title}" de ${formattedAmount} €`, 'create');
    
    await syncTripSettledState(tripId); // <-- [AFEGIT]
    
    return docRef.id;
  },

  updateExpense: async (tripId: string, expenseId: string, expense: Partial<Expense>) => {
    await updateDoc(getExpenseRef(tripId, expenseId), sanitizeData(expense));
    
    let detail = '';
    if (expense.amount) {
        detail = ` (nou import: ${(expense.amount / 100).toFixed(2).replace('.', ',')} €)`;
    }
    
    await logAction(tripId, `ha modificat la despesa "${expense.title || 'sense nom'}"${detail}`, 'update');
    
    await syncTripSettledState(tripId); // <-- [AFEGIT]
  },

  deleteExpense: async (tripId: string, expenseId: string) => {
    const snap = await getDoc(getExpenseRef(tripId, expenseId));
    let title = 'una despesa';
    let amountDetail = '';
    
    if (snap.exists()) {
        const data = snap.data();
        title = data.title || title;
        if (data.amount) {
            amountDetail = ` de ${(data.amount / 100).toFixed(2).replace('.', ',')} €`;
        }
    }
    
    await deleteDoc(getExpenseRef(tripId, expenseId));
    await logAction(tripId, `ha eliminat la despesa "${title}"${amountDetail}`, 'delete');
    
    await syncTripSettledState(tripId); // <-- [AFEGIT]
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
    
    const formattedAmount = (settlement.amount / 100).toFixed(2).replace('.', ',');
    await logAction(tripId, `ha liquidat un deute de ${formattedAmount} € via ${method}`, 'settle');
    
    await syncTripSettledState(tripId); // <-- [AFEGIT]
  },

  joinTripViaLink: async (tripId: string, user: User) => {
    try {
      const tripRef = getTripRef(tripId);
      const tripSnap = await getDoc(tripRef);
      
      // 1. Validació estricta: Si no existeix, LLANCEM error en lloc de marxar en silenci
      if (!tripSnap.exists()) {
        throw new Error("El codi no és vàlid o el projecte no existeix.");
      }

      const data = tripSnap.data();
      
      // 2. Validació estricta: Si està eliminat
      if (data.isDeleted) {
        throw new Error("Aquest projecte ha estat eliminat per l'administrador.");
      }

      const currentUsers = data.users || [];
      const alreadyExists = currentUsers.some(u => u.linkedUid === user.uid);

      if (alreadyExists) {
        if (data.memberUids && !data.memberUids.includes(user.uid)) {
          await updateDoc(tripRef, { memberUids: arrayUnion(user.uid) });
        }
        return; // Retornem si ja hi era (no cal crear l'usuari de nou)
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
      
    } catch (error: any) {
      console.error("Error en unir-se al viatge:", error);
      
      // Si l'error és de Firebase per permisos, ho traduïm a humà:
      if (error.code === 'permission-denied') {
        throw new Error("No tens permisos per unir-te a aquest projecte.");
      }
      
      throw new Error(error.message || "No s'ha pogut unir al viatge. Comprova el codi.");
    }
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

  // --- SOLUCIÓ "RISC ZERO" FRONT-END PER SORTIR DEL GRUP ---
  leaveTrip: async (tripId: string, internalUserId: string) => {
    try {
      const tripRef = getTripRef(tripId);
      const tripSnap = await getDoc(tripRef);
      
      if (!tripSnap.exists()) throw new Error("El projecte no existeix");
      
      const tripData = tripSnap.data();
      const currentUser = auth.currentUser;
      
      if (!currentUser) throw new Error("No estàs autenticat");

      // FIX: 1. Deixem el registre PRIMER, mentre l'usuari encara té permisos!
      await logAction(tripId, `ha abandonat el projecte`, 'settings');

      // 2. Desvinculem l'usuari (utilitzant null per evitar l'error de undefined)
      const updatedUsers = tripData.users.map(u => {
        if (u.id === internalUserId) {
          return { ...u, linkedUid: null, isAuth: false };
        }
        return u;
      });

      // 3. L'eliminem de la llista d'accessos reals a Firestore
      const updatedMemberUids = tripData.memberUids?.filter(uid => uid !== currentUser.uid) || [];

      // 4. Escriptura a base de dades (Tanquem la porta de permisos definitivament)
      await updateDoc(tripRef, {
        users: updatedUsers,
        memberUids: updatedMemberUids
      });

    } catch (error: any) {
      console.error("Error en sortir del viatge:", error);
      throw new Error(error.message || "No s'ha pogut sortir del grup. Torna-ho a provar.");
    }
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