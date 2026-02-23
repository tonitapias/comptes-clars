import { useState, useEffect, useMemo } from 'react';
import { doc, collection, onSnapshot, FirestoreError } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DB_PATHS } from '../config/dbPaths';
import { TripData, Expense, Payment, LogEntry } from '../types';

// [FASE 1 FIX]: Moguem la funció deduplicate fora del hook per evitar la seva 
// recreació en cada render. Funció pura.
const deduplicate = <T extends { id: string }>(arr1: T[], arr2: T[]): T[] => {
  const map = new Map<string, T>();
  [...arr1, ...arr2].forEach(item => {
    if (item && item.id) map.set(item.id, item);
  });
  return Array.from(map.values());
};

export function useTripData(tripId: string | undefined) {
  const [rawTripData, setRawTripData] = useState<TripData | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
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
    
    // 1. Subscripció al Trip
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

    // 3. Subscripció als Pagaments
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

    // 4. Subscripció als Logs
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

  // [FASE 1 FIX]: Memoització pesada.
  // Evitem fer un "sort" i iterar "Map" en memòria durant *cada render* del context.
  // Ara només es recalcula si les dades font canvien via Firebase.
  const tripData = useMemo(() => {
    if (!rawTripData) return null;

    const finalPayments = deduplicate(rawTripData.payments || [], subPayments);
    const finalLogs = deduplicate(rawTripData.logs || [], subLogs).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return {
      ...rawTripData,
      payments: finalPayments,
      logs: finalLogs
    };
  }, [rawTripData, subPayments, subLogs]);

  return { tripData, expenses, loading, error, isOffline };
}