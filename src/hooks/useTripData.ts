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

// [FASE 1 MILLORA]: useSyncExternalStore és l'estàndard de React 18+ per a APIs del navegador
const subscribeToOnlineStatus = (callback: () => void) => {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
};

export function useTripData(tripId: string | undefined) {
  // [FASE 1 MILLORA]: Agrupem els estats fortament acoblats. 
  // Això garanteix que les actualitzacions (ex: viatge + despeses) no generin renders innecessaris pel mig.
  const [state, setState] = useState({
    rawTripData: null as TripData | null,
    expenses: [] as Expense[],
    subPayments: [] as Payment[],
    subLogs: [] as LogEntry[],
    loading: true,
    error: null as string | null,
    // Comptadors interns per resoldre el loading un cop de forma precisa
    pendingInitialLoads: 3 
  });

  const isOffline = useSyncExternalStore(
    subscribeToOnlineStatus,
    () => !navigator.onLine,
    () => false // Fallback en SSR (Server-Side Rendering)
  );

  useEffect(() => {
    if (!tripId) {
      setState(prev => ({
        ...prev, rawTripData: null, expenses: [], subPayments: [], subLogs: [], loading: false, pendingInitialLoads: 0
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null, pendingInitialLoads: 3 }));

    // Funció atòmica per decrementar els loaders sense dependre de let variables externes
    const resolveLoad = () => setState(prev => ({ 
      ...prev, 
      pendingInitialLoads: Math.max(0, prev.pendingInitialLoads - 1),
      loading: prev.pendingInitialLoads - 1 > 0 
    }));

    const unsubTrip = onSnapshot(doc(db, DB_PATHS.getTripDocPath(tripId)), 
      (docSnap) => {
        setState(prev => ({
          ...prev,
          rawTripData: docSnap.exists() ? (docSnap.data() as TripData) : null,
          error: docSnap.exists() ? null : "Grup no trobat"
        }));
        resolveLoad();
      }, 
      (err: FirestoreError) => {
        setState(prev => ({ ...prev, error: err?.code === 'permission-denied' ? "⛔ Accés denegat." : "Error carregant el grup." }));
        resolveLoad();
      }
    );

    const unsubExpenses = onSnapshot(collection(db, DB_PATHS.getExpensesCollectionPath(tripId)), 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Expense[];
        setState(prev => ({ ...prev, expenses: data }));
        resolveLoad();
      }
    );

    const unsubPayments = onSnapshot(collection(db, DB_PATHS.getPaymentsCollectionPath(tripId)), 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Payment[];
        setState(prev => ({ ...prev, subPayments: data }));
        resolveLoad();
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

  // Derivació d'estat (Memoized)
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
    loading: state.loading, 
    error: state.error, 
    isOffline 
  };
}