import { 
  collection, doc, addDoc, updateDoc, deleteDoc, setDoc, writeBatch, 
  runTransaction, query, where, getDocs, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { Expense, TripData, Settlement } from '../types';

// Helpers per rutes
const getTripRef = (tripId: string) => doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`);
const getExpensesCol = (tripId: string) => collection(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`, 'expenses');
const getExpenseRef = (tripId: string, expenseId: string) => doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`, 'expenses', expenseId);

export const TripService = {
  // --- GESTIÓ DEL GRUP (DADES) ---
  
  createTrip: async (trip: TripData) => {
    // Utilitzem setDoc per definir nosaltres l'ID (trip_XXX) manualment
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

  leaveTrip: async (tripId: string, userId: string) => {
    // Elimina l'UID de l'usuari de la llista de membres (sense esborrar l'usuari del viatge)
    await updateDoc(getTripRef(tripId), { memberUids: arrayRemove(userId) });
  },

  // --- GESTIÓ DE PARTICIPANTS (NOMS) ---

  addUser: async (tripId: string, userName: string) => {
    await updateDoc(getTripRef(tripId), { users: arrayUnion(userName) });
  },

  removeUser: async (tripId: string, userName: string) => {
    await updateDoc(getTripRef(tripId), { users: arrayRemove(userName) });
  },

  linkAuthUser: async (tripId: string, uid: string) => {
    await updateDoc(getTripRef(tripId), { memberUids: arrayUnion(uid) });
  },

  renameUser: async (tripId: string, oldName: string, newName: string) => {
    // 1. Canviem la llista d'usuaris
    await runTransaction(db, async (transaction) => {
      const tripRef = getTripRef(tripId);
      const tripDoc = await transaction.get(tripRef);
      if (!tripDoc.exists()) throw new Error("Grup no trobat");
      
      const currentUsers = tripDoc.data().users || [];
      const newUsers = currentUsers.map((u: string) => u === oldName ? newName : u);
      transaction.update(tripRef, { users: newUsers });
    });

    // 2. Actualització en cascada a totes les despeses (Batching)
    const expensesRef = getExpensesCol(tripId);
    const payerQuery = query(expensesRef, where('payer', '==', oldName));
    const involvedQuery = query(expensesRef, where('involved', 'array-contains', oldName));
    const [payerDocs, involvedDocs] = await Promise.all([getDocs(payerQuery), getDocs(involvedQuery)]);
    
    const allDocs = new Map();
    payerDocs.forEach(d => allDocs.set(d.id, d));
    involvedDocs.forEach(d => allDocs.set(d.id, d));

    const docsArray = Array.from(allDocs.values());
    const chunkSize = 450; 

    for (let i = 0; i < docsArray.length; i += chunkSize) {
      const chunk = docsArray.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      
      chunk.forEach(docSnap => {
        const data = docSnap.data();
        const updates: any = {};
        
        if (data.payer === oldName) updates.payer = newName;
        
        if (data.involved?.includes(oldName)) {
            updates.involved = data.involved.map((inv: string) => inv === oldName ? newName : inv);
        }
        
        // Actualitzar splitDetails si existeix
        if (data.splitDetails && data.splitDetails[oldName] !== undefined) {
            const newDetails = { ...data.splitDetails, [newName]: data.splitDetails[oldName] };
            delete newDetails[oldName];
            updates.splitDetails = newDetails;
        }

        if (Object.keys(updates).length > 0) batch.update(docSnap.ref, updates);
      });
      
      await batch.commit();
    }
  },

  // --- GESTIÓ DE DESPESES ---

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