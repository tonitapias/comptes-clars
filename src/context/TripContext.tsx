// src/context/TripContext.tsx
import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { User } from 'firebase/auth';
import { useTripData } from '../hooks/useTripData';
import { useTripMigration } from '../hooks/useTripMigration';
import { useTripActions } from '../hooks/useTripActions';
import { TripData, Expense } from '../types';

interface TripState {
  tripId: string | undefined;
  tripData: TripData | null;
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  currentUser: User | null;
  isMember: boolean;
  isOffline: boolean; // [RISC ZERO]: Afegim isOffline a la interfície de l'estat
}

type TripDispatch = ReturnType<typeof useTripActions>;

const TripStateContext = createContext<TripState | undefined>(undefined);
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
  // [RISC ZERO]: Extraiem isOffline del nostre hook recentment actualitzat
  const { tripData, expenses, loading, error, isOffline } = useTripData(tripId);
  const actions = useTripActions(tripId);
  const isMember = !!(currentUser && tripData?.memberUids?.includes(currentUser.uid));

  // [RISC ZERO]: Afegim isOffline al value del Provider i a la llista de dependències del useMemo
  const stateValue = useMemo<TripState>(() => ({
    tripId, tripData, expenses, loading, error, currentUser, isMember, isOffline
  }), [tripId, tripData, expenses, loading, error, currentUser, isMember, isOffline]);

  const dispatchValue = useMemo<TripDispatch>(() => actions, [actions]);

  return (
    <TripDispatchContext.Provider value={dispatchValue}>
      <TripStateContext.Provider value={stateValue}>
        <TripMigrator tripId={tripId} tripData={tripData} />
        {children}
      </TripStateContext.Provider>
    </TripDispatchContext.Provider>
  );
}

// ============================================================================
// HOOKS CONSUMIDORS OPTIMITZATS
// ============================================================================
// [REFACTOR]: Eliminat el 'useTrip' legacy complint l'auditoria.

export function useTripState() {
  const context = useContext(TripStateContext);
  if (context === undefined) {
    throw new Error('useTripState must be used within a TripProvider');
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