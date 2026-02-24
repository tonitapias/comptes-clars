// src/hooks/useTripData.ts
import { useReducer, useEffect, useMemo, useSyncExternalStore } from 'react';
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

// --- 1. DEFINICIÓ DE L'ESTAT ---
interface TripDataState {
  rawTripData: TripData | null;
  expenses: Expense[];
  subPayments: Payment[];
  subLogs: LogEntry[];
  error: string | null;
  loadStatus: {
    trip: boolean;
    expenses: boolean;
    payments: boolean;
  };
}

const initialState: TripDataState = {
  rawTripData: null,
  expenses: [],
  subPayments: [],
  subLogs: [],
  error: null,
  loadStatus: { trip: false, expenses: false, payments: false }
};

// --- 2. DEFINICIÓ DE LES ACCIONS ---
type TripDataAction =
  | { type: 'CLEAR' }
  | { type: 'INIT_FETCH' }
  | { type: 'TRIP_SUCCESS'; payload: TripData | null }
  | { type: 'TRIP_ERROR'; payload: string }
  | { type: 'EXPENSES_SUCCESS'; payload: Expense[] }
  | { type: 'PAYMENTS_SUCCESS'; payload: Payment[] }
  | { type: 'LOGS_SUCCESS'; payload: LogEntry[] };

// --- 3. EL REDUCER (Lògica pura i predictible) ---
function tripDataReducer(state: TripDataState, action: TripDataAction): TripDataState {
  switch (action.type) {
    case 'CLEAR':
      return { ...initialState, loadStatus: { trip: true, expenses: true, payments: true } };
    case 'INIT_FETCH':
      return { ...initialState };
    case 'TRIP_SUCCESS':
      return {
        ...state,
        rawTripData: action.payload,
        error: action.payload ? null : "Grup no trobat",
        loadStatus: { ...state.loadStatus, trip: true }
      };
    case 'TRIP_ERROR':
      return {
        ...state,
        error: action.payload,
        loadStatus: { ...state.loadStatus, trip: true }
      };
    case 'EXPENSES_SUCCESS':
      return {
        ...state,
        expenses: action.payload,
        loadStatus: { ...state.loadStatus, expenses: true }
      };
    case 'PAYMENTS_SUCCESS':
      return {
        ...state,
        subPayments: action.payload,
        loadStatus: { ...state.loadStatus, payments: true }
      };
    case 'LOGS_SUCCESS':
      return {
        ...state,
        subLogs: action.payload
      };
    default:
      return state;
  }
}

// --- 4. EL HOOK ---
export function useTripData(tripId: string | undefined) {
  const [state, dispatch] = useReducer(tripDataReducer, initialState);

  const isOffline = useSyncExternalStore(
    subscribeToOnlineStatus,
    () => !navigator.onLine,
    () => false 
  );

  useEffect(() => {
    if (!tripId) {
      dispatch({ type: 'CLEAR' });
      return;
    }

    dispatch({ type: 'INIT_FETCH' });

    const unsubTrip = onSnapshot(doc(db, DB_PATHS.getTripDocPath(tripId)), 
      (docSnap) => {
        dispatch({ type: 'TRIP_SUCCESS', payload: docSnap.exists() ? (docSnap.data() as TripData) : null });
      }, 
      (err: FirestoreError) => {
        dispatch({ 
          type: 'TRIP_ERROR', 
          payload: err?.code === 'permission-denied' ? "⛔ Accés denegat." : "Error carregant el grup." 
        });
      }
    );

    const unsubExpenses = onSnapshot(collection(db, DB_PATHS.getExpensesCollectionPath(tripId)), 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Expense[];
        dispatch({ type: 'EXPENSES_SUCCESS', payload: data });
      }
    );

    const unsubPayments = onSnapshot(collection(db, DB_PATHS.getPaymentsCollectionPath(tripId)), 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Payment[];
        dispatch({ type: 'PAYMENTS_SUCCESS', payload: data });
      }
    );

    const unsubLogs = onSnapshot(collection(db, DB_PATHS.getLogsCollectionPath(tripId)), 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LogEntry[];
        dispatch({ type: 'LOGS_SUCCESS', payload: data });
      }
    );

    return () => {
      unsubTrip(); unsubExpenses(); unsubPayments(); unsubLogs();
    };
  }, [tripId]);

  const loading = useMemo(() => {
    return !state.loadStatus.trip || !state.loadStatus.expenses || !state.loadStatus.payments;
  }, [state.loadStatus]);

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