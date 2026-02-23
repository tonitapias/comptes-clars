import { useState, useEffect } from 'react';
import { doc, collection, onSnapshot, FirestoreError } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DB_PATHS } from '../config/dbPaths'; // <-- Afegit per utilitzar les rutes estandarditzades
import { TripData, Expense, Payment, LogEntry } from '../types';

export function useTripData(tripId: string | undefined) {
  const [rawTripData, setRawTripData] = useState<TripData | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // [NOVA ARQUITECTURA]: Estats separats per a les noves subcol·leccions
  const [subPayments, setSubPayments] = useState<Payment[]>([]);
  const [subLogs, setSubLogs] = useState<LogEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!tripId) {
      setRawTripData(null);
      setExpenses([]);
      setSubPayments([]);
      setSubLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let isTripReady = false;
    let isExpensesReady = false;
    let isPaymentsReady = false;

    const resolveLoading = () => {
      if (isTripReady && isExpensesReady && isPaymentsReady) {
        setLoading(false);
      }
    };
    
    // 1. Subscripció al Trip (Dades base)
    const tripRef = doc(db, DB_PATHS.getTripDocPath(tripId));
    const unsubTrip = onSnapshot(tripRef, (docSnap) => {
      if (docSnap.exists()) {
        setRawTripData(docSnap.data() as TripData);
        setError(null);
      } else {
        setError("Grup no trobat");
        setRawTripData(null);
      }
      isTripReady = true;
      resolveLoading();
    }, (err: FirestoreError) => {
      if (err?.code !== 'permission-denied') console.error(err);
      setError(err?.code === 'permission-denied' ? "⛔ Accés denegat." : "Error carregant el grup.");
      isTripReady = true;
      resolveLoading();
    });

    // 2. Subscripció a les Despeses
    const expensesRef = collection(db, DB_PATHS.getExpensesCollectionPath(tripId));
    const unsubExpenses = onSnapshot(expensesRef, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Expense[]);
      isExpensesReady = true;
      resolveLoading();
    }, (err: FirestoreError) => {
      if (err?.code !== 'permission-denied') console.error("Error carregant despeses:", err);
      isExpensesReady = true;
      resolveLoading();
    });

    // 3. Subscripció als Pagaments (Subcol·lecció)
    const paymentsRef = collection(db, DB_PATHS.getPaymentsCollectionPath(tripId));
    const unsubPayments = onSnapshot(paymentsRef, (snapshot) => {
      setSubPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Payment[]);
      isPaymentsReady = true;
      resolveLoading();
    }, (err: FirestoreError) => {
      if (err?.code !== 'permission-denied') console.error("Error carregant pagaments:", err);
      isPaymentsReady = true;
      resolveLoading();
    });

    // 4. Subscripció als Logs (Subcol·lecció)
    const logsRef = collection(db, DB_PATHS.getLogsCollectionPath(tripId));
    const unsubLogs = onSnapshot(logsRef, (snapshot) => {
      setSubLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LogEntry[]);
    }, (err: FirestoreError) => {
      if (err?.code !== 'permission-denied') console.error("Error carregant logs:", err);
    });

    return () => {
      unsubTrip();
      unsubExpenses();
      unsubPayments();
      unsubLogs();
    };
  }, [tripId]);

  // [FIX RENDIMENT I REACT WARNINGS]: Funció per eliminar duplicats.
  // Això evita que, durant la transició de l'arquitectura híbrida, 
  // una mateixa despesa o log aparegui duplicada a la UI.
  const deduplicate = <T extends { id: string }>(arr1: T[], arr2: T[]): T[] => {
    const map = new Map<string, T>();
    [...arr1, ...arr2].forEach(item => {
      if (item && item.id) map.set(item.id, item);
    });
    return Array.from(map.values());
  };

  // Apliquem la deduplicació en lloc de concatenar a cegues
  const tripData = rawTripData ? {
    ...rawTripData,
    payments: deduplicate(rawTripData.payments || [], subPayments),
    logs: deduplicate(rawTripData.logs || [], subLogs).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  } : null;

  return { tripData, expenses, loading, error, isOffline };
}