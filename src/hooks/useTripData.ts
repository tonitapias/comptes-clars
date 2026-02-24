// src/hooks/useTripData.ts
import { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import { doc, collection, onSnapshot, FirestoreError } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DB_PATHS } from '../config/dbPaths';
import { TripData, Expense, Payment, LogEntry } from '../types';

const deduplicate = <T extends { id: string }>(arr1: T[], arr2: T[]): T[] => {
  const map = new Map<string, T>();
  [...arr1, ...arr2].forEach(item => {
    if (item?.id) map.set(item.id, item);
  });
  return Array.from(map.values());
};

const sortLogsDesc = (a: LogEntry, b: LogEntry) => b.timestamp.localeCompare(a.timestamp);

const subscribeToOnlineStatus = (callback: () => void) => {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
};

export function useTripData(tripId: string | undefined) {
  const [state, setState] = useState({
    rawTripData: null as TripData | null,
    expenses: [] as Expense[],
    subPayments: [] as Payment[],
    subLogs: [] as LogEntry[],
    error: null as string | null,
  });

  // [MILLORA FASE 1]: Rastreig explícit de cada listener de Firebase.
  // Evitem el bug on múltiples respostes de cache+servidor corrompien el comptador.
  const [loadStatus, setLoadStatus] = useState({
    trip: false,
    expenses: false,
    payments: false,
    // logs no bloqueja la UI inicial, ho podem considerar opcional per al "loading" general.
  });

  const isOffline = useSyncExternalStore(
    subscribeToOnlineStatus,
    () => !navigator.onLine,
    () => false 
  );

  useEffect(() => {
    if (!tripId) {
      setState({ rawTripData: null, expenses: [], subPayments: [], subLogs: [], error: null });
      setLoadStatus({ trip: true, expenses: true, payments: true }); // Resolt immediatament
      return;
    }

    setLoadStatus({ trip: false, expenses: false, payments: false });
    setState(prev => ({ ...prev, error: null }));

    const unsubTrip = onSnapshot(doc(db, DB_PATHS.getTripDocPath(tripId)), 
      (docSnap) => {
        setState(prev => ({
          ...prev,
          rawTripData: docSnap.exists() ? (docSnap.data() as TripData) : null,
          error: docSnap.exists() ? null : "Grup no trobat"
        }));
        setLoadStatus(prev => ({ ...prev, trip: true }));
      }, 
      (err: FirestoreError) => {
        setState(prev => ({ ...prev, error: err?.code === 'permission-denied' ? "⛔ Accés denegat." : "Error carregant el grup." }));
        setLoadStatus(prev => ({ ...prev, trip: true }));
      }
    );

    const unsubExpenses = onSnapshot(collection(db, DB_PATHS.getExpensesCollectionPath(tripId)), 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Expense[];
        setState(prev => ({ ...prev, expenses: data }));
        setLoadStatus(prev => ({ ...prev, expenses: true }));
      }
    );

    const unsubPayments = onSnapshot(collection(db, DB_PATHS.getPaymentsCollectionPath(tripId)), 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Payment[];
        setState(prev => ({ ...prev, subPayments: data }));
        setLoadStatus(prev => ({ ...prev, payments: true }));
      }
    );

    const unsubLogs = onSnapshot(collection(db, DB_PATHS.getLogsCollectionPath(tripId)), 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LogEntry[];
        setState(prev => ({ ...prev, subLogs: data }));
      }
    );

    return () => {
      unsubTrip(); unsubExpenses(); unsubPayments(); unsubLogs();
    };
  }, [tripId]);

  // Càlcul derivat de l'estat de càrrega total
  const loading = useMemo(() => {
    return !loadStatus.trip || !loadStatus.expenses || !loadStatus.payments;
  }, [loadStatus]);

  const tripData = useMemo(() => {
    if (!state.rawTripData) return null;

    return {
      ...state.rawTripData,
      payments: deduplicate(state.rawTripData.payments || [], state.subPayments),
      logs: deduplicate(state.rawTripData.logs || [], state.subLogs).sort(sortLogsDesc)
    };
  }, [state.rawTripData, state.subPayments, state.subLogs]);

  return { 
    tripData, 
    expenses: state.expenses, 
    loading, 
    error: state.error, 
    isOffline 
  };
}