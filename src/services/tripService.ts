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

const tripConverter: FirestoreDataConverter<TripData> = {
  toFirestore: (trip: TripData) => {
    return {
      ...trip,
      logs: trip.logs || [],
      memberUids: trip.memberUids || [],
      ownerId: trip.ownerId || null,
      payments: trip.payments || []
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
  // [FASE 2 FIX]: Llançament de clau d'error agnòstica en lloc de text en català
  if (!tripId) throw new Error("ERRORS.INVALID_TRIP_ID");
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
      throw new Error("ERRORS.FETCH_TRIPS_FAILED");
    }
  },

  getTripExpenses: async (tripId: string): Promise<Expense[]> => {
    try {
      const snap = await getDocs(getExpensesCol(tripId));
      return snap.docs.map(d => ({ ...d.data(), id: d.id })) as Expense[];
    } catch (error) {
      console.error("Error obtenint despeses:", error);
      throw new Error("ERRORS.FETCH_EXPENSES_FAILED");
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
    await setDoc(getTripRef(trip.id), tripWithMembers);
  },

  updateTrip: async (tripId: string, data: Partial<TripData>) => {
    const log = createLogEntry(`ha actualitzat la configuració`, 'settings');
    const batch = writeBatch(db);
    
    batch.update(getTripRef(tripId), data as UpdateData<TripData>);
    batch.set(doc(getLogsCol(tripId), log.id), log);
    
    await batch.commit();
  },

  updateTripSettledState: async (tripId: string, isSettled: boolean) => {
    await updateDoc(getTripRef(tripId), { isSettled });
  },

  deleteTrip: async (tripId: string) => {
    const log = createLogEntry(`ha arxivat el projecte`, 'settings');
    const batch = writeBatch(db);
    
    batch.update(getTripRef(tripId), { isDeleted: true });
    batch.set(doc(getLogsCol(tripId), log.id), log);
    
    await batch.commit();
  },

  addExpense: async (tripId: string, expense: Omit<Expense, 'id'>) => {
    ExpenseSchema.parse(expense); 
    
    const newExpenseRef = doc(getExpensesCol(tripId)); 
    const formattedAmount = (expense.amount / 100).toFixed(2).replace('.', ',');
    const log = createLogEntry(`ha afegit la despesa "${expense.title}" de ${formattedAmount} €`, 'create');
    
    const batch = writeBatch(db);
    batch.set(newExpenseRef, expense);
    batch.update(getTripRef(tripId), { isSettled: false });
    batch.set(doc(getLogsCol(tripId), log.id), log);
    
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
    batch.update(getExpenseRef(tripId, expenseId), expense as any);
    batch.update(getTripRef(tripId), { isSettled: false });
    batch.set(doc(getLogsCol(tripId), log.id), log);

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
    batch.set(doc(getLogsCol(tripId), log.id), log);
    
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
    batch.set(doc(getPaymentsCol(tripId), payment.id), payment);
    batch.set(doc(getLogsCol(tripId), log.id), log);
    
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
    
    batch.set(doc(getLogsCol(tripId), log.id), log);
    
    await batch.commit();
  },

  joinTripViaLink: async (tripId: string, user: User) => {
    try {
      const tripRef = getTripRef(tripId);
      const tripSnap = await getDoc(tripRef);
      
      // [FASE 2 FIX]: Substituïm el text per la clau d'error
      if (!tripSnap.exists()) throw new Error("ERRORS.JOIN_INVALID_CODE");
      
      const data = tripSnap.data();
      // [FASE 2 FIX]: Substituïm el text per la clau d'error
      if (data.isDeleted) throw new Error("ERRORS.JOIN_TRIP_DELETED");

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
        users: arrayUnion(newUser),
        memberUids: arrayUnion(user.uid)
      });
      batch.set(doc(getLogsCol(tripId), log.id), log);
      
      await batch.commit();
      
    } catch (error: unknown) { // [FASE 1 FIX]
      console.error("Error en unir-se al viatge:", error);
      
      // Comprovació segura de l'objecte d'error de Firebase
      const isPermissionDenied = error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied';
      
      // [FASE 2 FIX]: Substituïm textos per claus
      if (isPermissionDenied) throw new Error("ERRORS.PERMISSION_DENIED");
      
      if (error instanceof Error) throw new Error(error.message); // Manté la clau propagada des de dalt (ex: ERRORS.JOIN_TRIP_DELETED)
      throw new Error("ERRORS.JOIN_FAILED");
    }
  },

  updateTripUserName: async (tripId: string, userId: string, newName: string) => {
    if (!tripId) throw new Error("ERRORS.INVALID_TRIP_ID");
    const tripRef = getTripRef(tripId); 
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) throw new Error("ERRORS.TRIP_NOT_FOUND");
    const tripData = tripSnap.data(); 

    const updatedUsers = tripData.users.map(u => {
      if (u.id === userId) return { ...u, name: newName, photoUrl: null };
      return u;
    });

    const log = createLogEntry(`ha canviat el nom d'un participant`, 'settings');

    const batch = writeBatch(db);
    batch.update(tripRef, { users: updatedUsers });
    batch.set(doc(getLogsCol(tripId), log.id), log);
    
    await batch.commit();
  },

  leaveTrip: async (tripId: string, internalUserId: string) => {
    try {
      const tripRef = getTripRef(tripId);
      const tripSnap = await getDoc(tripRef);
      
      // [FASE 2 FIX]: Clau agnòstica en lloc de text fix
      if (!tripSnap.exists()) throw new Error("ERRORS.TRIP_NOT_FOUND");
      
      const tripData = tripSnap.data();
      const currentUser = auth.currentUser;
      
      // [FASE 2 FIX]: Clau agnòstica en lloc de text fix
      if (!currentUser) throw new Error("ERRORS.NOT_AUTHENTICATED");

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
      batch.set(doc(getLogsCol(tripId), log.id), log);
      
      await batch.commit();
    } catch (error: unknown) { // [FASE 1 FIX]
      console.error("Error en sortir del viatge:", error);
      if (error instanceof Error) throw new Error(error.message); // Manté l'error de domini (ex: ERRORS.TRIP_NOT_FOUND)
      
      // [FASE 2 FIX]: Error genèric amb clau
      throw new Error("ERRORS.LEAVE_TRIP_FAILED");
    }
  },

  linkUserToAccount: async (tripId: string, tripUserId: string, user: User) => {
    const tripRef = getTripRef(tripId);
    const tripSnap = await getDoc(tripRef);
    if (!tripSnap.exists()) throw new Error("ERRORS.TRIP_NOT_FOUND");

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
    batch.set(doc(getLogsCol(tripId), log.id), log);
    
    await batch.commit();
  }
};