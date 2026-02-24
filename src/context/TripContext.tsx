// src/context/TripContext.tsx
import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { User } from 'firebase/auth';
import { useTripData } from '../hooks/useTripData';
import { useTripMigration } from '../hooks/useTripMigration';
import { useTripActions } from '../hooks/useTripActions';
import { TripData, Expense } from '../types'; 

// --- 1. DEFINICIÓ DELS NOUS ESTATS SEPARATS ---

interface TripMetaState {
  tripId: string | undefined;
  tripData: TripData | null;
  loading: boolean;
  error: string | null;
  currentUser: User | null;
  isMember: boolean;
  isOffline: boolean; 
}

interface TripExpensesState {
  expenses: Expense[];
}

type TripDispatch = ReturnType<typeof useTripActions>;

// --- 2. CREACIÓ DELS CONTEXTOS ---

const TripMetaContext = createContext<TripMetaState | undefined>(undefined);
const TripExpensesContext = createContext<TripExpensesState | undefined>(undefined);
const TripDispatchContext = createContext<TripDispatch | undefined>(undefined);

interface TripProviderProps {
  children: ReactNode;
  tripId: string | undefined;
  currentUser: User | null;
}

const TripMigrator = React.memo(({ tripId, tripData }: { tripId: string | undefined, tripData: TripData | null }) => {
  useTripMigration(tripId, tripData);
  return null;
});

export function TripProvider({ children, tripId, currentUser }: TripProviderProps) {
  const { tripData, expenses, loading, error, isOffline } = useTripData(tripId);
  const actions = useTripActions(tripId);
  
  const isMember = useMemo(() => {
    return !!(currentUser && tripData?.memberUids?.includes(currentUser.uid));
  }, [currentUser, tripData?.memberUids]);

  // [FASE 2 FIX]: Dades estructurals del viatge (muten poc)
  const metaValue = useMemo<TripMetaState>(() => ({
    tripId, tripData, loading, error, currentUser, isMember, isOffline
  }), [tripId, tripData, loading, error, currentUser, isMember, isOffline]);

  // [FASE 2 FIX]: Dades de despeses (muten sovint quan s'afegeix/edita/esborra)
  const expensesValue = useMemo<TripExpensesState>(() => ({
    expenses
  }), [expenses]);

  const dispatchValue = useMemo<TripDispatch>(() => actions, [actions]);

  return (
    <TripDispatchContext.Provider value={dispatchValue}>
      <TripMetaContext.Provider value={metaValue}>
        <TripExpensesContext.Provider value={expensesValue}>
          <TripMigrator tripId={tripId} tripData={tripData} />
          {children}
        </TripExpensesContext.Provider>
      </TripMetaContext.Provider>
    </TripDispatchContext.Provider>
  );
}

// ============================================================================
// HOOKS CONSUMIDORS OPTIMITZATS
// ============================================================================

export function useTripMeta() {
  const context = useContext(TripMetaContext);
  if (context === undefined) {
    throw new Error('useTripMeta must be used within a TripProvider');
  }
  return context;
}

export function useTripExpenses() {
  const context = useContext(TripExpensesContext);
  if (context === undefined) {
    throw new Error('useTripExpenses must be used within a TripProvider');
  }
  return context;
}

export function useTripDispatch() {
  const context = useContext(TripDispatchContext);
  if (context === undefined) {
    throw new Error('useTripDispatch must be used within a TripProvider');
  }
  return context;
}