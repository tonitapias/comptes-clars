// src/services/tripService.ts

import { 
  collection, doc, updateDoc, getDocs, getDoc, setDoc, query, where, arrayUnion,
  FirestoreDataConverter, QueryDocumentSnapshot, SnapshotOptions, UpdateData, writeBatch 
} from 'firebase/firestore'; 
import { User } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { DB_PATHS, TRIP_DOC_PREFIX } from '../config/dbPaths';
import { Expense, TripData, Settlement, TripUser, LogEntry, Currency, Payment } from '../types';
import { ExpenseSchema } from '../utils/validation';

// [FASE 2 MILLORA]: Utilitzem la serialització del motor C++ (V8) del navegador.
// És ~10x més ràpid que un bucle recursiu en JS. 
// Elimina automàticament els 'undefined' i converteix els objectes 'Date' a strings ISO-8601.
const cleanPayload = <T>(data: T): T => {
  return JSON.parse(JSON.stringify(data));
};

const tripConverter: FirestoreDataConverter<TripData> = {
  toFirestore: (trip: TripData) => {
    const sanitized = cleanPayload(trip);
    return {
      ...sanitized,
      logs: sanitized.logs || [],
      memberUids: sanitized.memberUids || [],
      ownerId: sanitized.ownerId || null,
      payments: sanitized.payments || []
    };
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TripData => {
    const data = snapshot.data(options);
    return {
      id: snapshot.id.replace(TRIP_DOC_PREFIX, ''), 
      name: data.name || 'Viatge sense nom',
      users: data.users || [],
      expenses: data.expenses || [],
      payments: data.payments || [],
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

const getExpensesCol = (tripId: string) => collection(db, DB_PATHS.getExpensesCollectionPath(tripId));
const getExpenseRef = (tripId: string, expenseId: string) => doc(db, DB_PATHS.getExpenseDocPath(tripId, expenseId));

const getLogsCol = (tripId: string) => collection(db, DB_PATHS.getLogsCollectionPath(tripId));
const getPaymentsCol = (tripId: string) => collection(db, DB_PATHS.getPaymentsCollectionPath(tripId));

const generateId = () => crypto.randomUUID();

const createLogEntry = (message: string, action: LogEntry['action']): LogEntry => {
  const currentUser = auth.currentUser;
  const finalUserName = currentUser?.displayName || 'Algú';

  return {
    id: generateId(),
    action,
    message,
    userId: currentUser?.uid || 'anonymous',
    userName: finalUserName,
    timestamp: new Date().toISOString()
  };
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

  getTripPayments: async (tripId: string): Promise<Payment[]> => {
    try {
      const snap = await getDocs(getPaymentsCol(tripId));
      return snap.docs.map(d => ({ ...d.data(), id: d.id })) as Payment[];
    } catch (error) {
      console.error("Error obtenint pagaments:", error);
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
      payments: [],
      isDeleted: false,
      isSettled: true 
    };
    await setDoc(getTripRef(trip.id), cleanPayload(tripWithMembers));
  },

  updateTrip: async (tripId: string, data: Partial<TripData>) => {
    const log = createLogEntry(`ha actualitzat la configuració`, 'settings');
    const batch = writeBatch(db);
    
    batch.update(getTripRef(tripId), cleanPayload(data) as UpdateData<TripData>);
    batch.set(doc(getLogsCol(tripId), log.id), cleanPayload(log));
    
    await batch.commit();
  },

  updateTripSettledState: async (tripId: string, isSettled: boolean) => {
    await updateDoc(getTripRef(tripId), { isSettled });
  },

  deleteTrip: async (tripId: string) => {
    const log = createLogEntry(`ha arxivat el projecte`, 'settings');
    const batch = writeBatch(db);
    
    batch.update(getTripRef(tripId), { isDeleted: true });
    batch.set(doc(getLogsCol(tripId), log.id), cleanPayload(log));
    
    await batch.commit();
  },

  addExpense: async (tripId: string, expense: Omit<Expense, 'id'>) => {
    // [FASE 2 MILLORA]: Forcem la validació del Schema abans de continuar. Fail-Fast.
    ExpenseSchema.parse(expense); 
    
    const cleanExpense = cleanPayload(expense);
    const newExpenseRef = doc(getExpensesCol(tripId)); 
    
    const formattedAmount = (expense.amount / 100).toFixed(2).replace('.', ',');
    const log = createLogEntry(`ha afegit la despesa "${expense.title}" de ${formattedAmount} €`, 'create');
    
    const batch = writeBatch(db);
    batch.set(newExpenseRef, cleanExpense);
    batch.update(getTripRef(tripId), { isSettled: false });
    batch.set(doc(getLogsCol(tripId), log.id), cleanPayload(log));
    
    await batch.commit();
    return newExpenseRef.id;
  },

  updateExpense: async (tripId: string, expenseId: string, expense: Partial<Expense>) => {
    let detail = '';
    if (expense.amount) {
        detail = ` (nou import: ${(expense.amount / 100).toFixed(2).replace('.', ',')} €)`;
    }
    const log = createLogEntry(`ha modificat la despesa "${expense.title || 'sense nom'}"${detail}`, 'update');

    const batch = writeBatch(db);
    batch.update(getExpenseRef(tripId, expenseId), cleanPayload(expense));
    batch.update(getTripRef(tripId), { isSettled: false });
    batch.set(doc(getLogsCol(tripId), log.id), cleanPayload(log));

    await batch.commit();
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
    
    const log = createLogEntry(`ha eliminat la despesa "${title}"${amountDetail}`, 'delete');

    const batch = writeBatch(db);
    batch.delete(getExpenseRef(tripId, expenseId));
    batch.set(doc(getLogsCol(tripId), log.id), cleanPayload(log));
    
    await batch.commit();
  },

  settleDebt: async (tripId: string, settlement: Settlement, method: string) => {
    const payment: Payment = {
      id: generateId(),
      from: settlement.from,
      to: settlement.to,
      amount: settlement.amount,
      date: new Date().toISOString(),
      method: method as Payment['method']
    };

    const getMethodText = (m: string) => {
        switch(m) {
            case 'manual': return 'en efectiu';
            case 'bizum': return 'per Bizum';
            case 'transfer': return 'per transferència bancària';
            case 'card': return 'amb targeta';
            default: return `via ${m}`;
        }
    };
    
    const formattedAmount = (settlement.amount / 100).toFixed(2).replace('.', ',');
    const log = createLogEntry(`ha liquidat un deute de ${formattedAmount} € ${getMethodText(method)}`, 'settle');

    const batch = writeBatch(db);
    batch.set(doc(getPaymentsCol(tripId), payment.id), cleanPayload(payment));
    batch.set(doc(getLogsCol(tripId), log.id), cleanPayload(log));
    
    await batch.commit();
  },

  deletePayment: async (tripId: string, paymentId: string, currentPayments: Payment[]) => {
    const paymentToDelete = currentPayments.find(p => p.id === paymentId);
    
    let amountDetail = '';
    if (paymentToDelete) {
       amountDetail = ` de ${(paymentToDelete.amount / 100).toFixed(2).replace('.', ',')} €`;
    }
    
    const log = createLogEntry(`ha anul·lat una liquidació${amountDetail}`, 'delete');

    const batch = writeBatch(db);
    
    batch.delete(doc(getPaymentsCol(tripId), paymentId));
    
    const newPayments = currentPayments.filter(p => p.id !== paymentId);
    batch.update(getTripRef(tripId), { payments: newPayments });
    
    batch.set(doc(getLogsCol(tripId), log.id), cleanPayload(log));
    
    await batch.commit();
  },

  joinTripViaLink: async (tripId: string, user: User) => {
    try {
      const tripRef = getTripRef(tripId);
      const tripSnap = await getDoc(tripRef);
      
      if (!tripSnap.exists()) throw new Error("El codi no és vàlid o el projecte no existeix.");
      const data = tripSnap.data();
      if (data.isDeleted) throw new Error("Aquest projecte ha estat eliminat per l'administrador.");

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

      const log = createLogEntry(`s'ha unit al grup`, 'join');

      const batch = writeBatch(db);
      batch.update(tripRef, {
        users: arrayUnion(cleanPayload(newUser)),
        memberUids: arrayUnion(user.uid)
      });
      batch.set(doc(getLogsCol(tripId), log.id), cleanPayload(log));
      
      await batch.commit();
      
    } catch (error: any) {
      console.error("Error en unir-se al viatge:", error);
      if (error?.code === 'permission-denied') throw new Error("No tens permisos per unir-te a aquest projecte.");
      if (error instanceof Error) throw new Error(error.message);
      throw new Error("No s'ha pogut unir al viatge. Comprova el codi.");
    }
  },

  updateTripUserName: async (tripId: string, userId: string, newName: string) => {
    if (!tripId) throw new Error("ID de viatge no vàlid");
    const tripRef = getTripRef(tripId); 
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) throw new Error("El viatge no existeix");
    const tripData = tripSnap.data(); 

    const updatedUsers = tripData.users.map(u => {
      if (u.id === userId) return { ...u, name: newName, photoUrl: null };
      return u;
    });

    const log = createLogEntry(`ha canviat el nom d'un participant`, 'settings');

    const batch = writeBatch(db);
    batch.update(tripRef, { users: updatedUsers });
    batch.set(doc(getLogsCol(tripId), log.id), cleanPayload(log));
    
    await batch.commit();
  },

  leaveTrip: async (tripId: string, internalUserId: string) => {
    try {
      const tripRef = getTripRef(tripId);
      const tripSnap = await getDoc(tripRef);
      
      if (!tripSnap.exists()) throw new Error("El projecte no existeix");
      const tripData = tripSnap.data();
      const currentUser = auth.currentUser;
      
      if (!currentUser) throw new Error("No estàs autenticat");

      const log = createLogEntry(`ha abandonat el projecte`, 'settings');

      const updatedUsers = tripData.users.map(u => {
        if (u.id === internalUserId) return { ...u, linkedUid: null, isAuth: false };
        return u;
      });

      const updatedMemberUids = tripData.memberUids?.filter(uid => uid !== currentUser.uid) || [];

      const batch = writeBatch(db);
      batch.update(tripRef, { 
        users: updatedUsers, 
        memberUids: updatedMemberUids
      });
      batch.set(doc(getLogsCol(tripId), log.id), cleanPayload(log));
      
      await batch.commit();
    } catch (error: any) {
      console.error("Error en sortir del viatge:", error);
      if (error instanceof Error) throw new Error(error.message);
      throw new Error("No s'ha pogut sortir del grup. Torna-ho a provar.");
    }
  },

  linkUserToAccount: async (tripId: string, tripUserId: string, user: User) => {
    const tripRef = getTripRef(tripId);
    const tripSnap = await getDoc(tripRef);
    if (!tripSnap.exists()) throw new Error("Viatge no trobat");

    const data = tripSnap.data();
    const updatedUsers = data.users.map(u => {
      if (u.id === tripUserId) return { ...u, linkedUid: user.uid, photoUrl: user.photoURL || null, isAuth: true };
      return u;
    });

    const log = createLogEntry(`ha reclamat un perfil`, 'join');

    const batch = writeBatch(db);
    batch.update(tripRef, { 
      users: updatedUsers, 
      memberUids: arrayUnion(user.uid)
    });
    batch.set(doc(getLogsCol(tripId), log.id), cleanPayload(log));
    
    await batch.commit();
  }
};