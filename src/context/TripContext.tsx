import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { User } from 'firebase/auth';
import { useTripData } from '../hooks/useTripData';
import { useTripMigration } from '../hooks/useTripMigration';
import { useTripActions } from '../hooks/useTripActions';
import { TripData, Expense } from '../types';

// 1. Definim les formes dels nous Contexts separats
interface TripState {
  tripId: string | undefined;
  tripData: TripData | null;
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  currentUser: User | null;
  isMember: boolean;
}

// Utilitzem ReturnType per mantenir el tipatge dinàmic de les accions sense trencar cap signatura
type TripDispatch = ReturnType<typeof useTripActions>;

// 2. Creem els dos Contexts
const TripStateContext = createContext<TripState | undefined>(undefined);
const TripDispatchContext = createContext<TripDispatch | undefined>(undefined);

interface TripProviderProps {
  children: ReactNode;
  tripId: string | undefined;
  currentUser: User | null;
}

// --- SUB-COMPONENT: Aïllament d'Efectes ---
const TripMigrator = React.memo(({ tripId, tripData }: { tripId: string | undefined, tripData: TripData | null }) => {
  useTripMigration(tripId, tripData);
  return null;
});

export function TripProvider({ children, tripId, currentUser }: TripProviderProps) {
  // Data Fetching
  const { tripData, expenses, loading, error } = useTripData(tripId);

  // Actions Hook
  const actions = useTripActions(tripId);

  // Derived State
  const isMember = !!(currentUser && tripData?.memberUids?.includes(currentUser.uid));

  // 3. Memoització separada per a l'Estat (Lectura)
  const stateValue = useMemo<TripState>(() => ({
    tripId,
    tripData,
    expenses,
    loading,
    error,
    currentUser,
    isMember
  }), [
    tripId, 
    tripData, 
    expenses, 
    loading, 
    error, 
    currentUser, 
    isMember
  ]);

  // 4. Memoització separada per a les Accions (Escriptura)
  const dispatchValue = useMemo<TripDispatch>(() => actions, [actions]);

  return (
    <TripDispatchContext.Provider value={dispatchValue}>
      <TripStateContext.Provider value={stateValue}>
        {/* Execució aïllada de la migració */}
        <TripMigrator tripId={tripId} tripData={tripData} />
        {children}
      </TripStateContext.Provider>
    </TripDispatchContext.Provider>
  );
}

// ============================================================================
// HOOKS CONSUMIDORS
// ============================================================================

// 🌟 HOOK LEGACY (PROXY PER COMPATIBILITAT - RISC ZERO)
// Retorna EXACTAMENT la mateixa estructura que l'antic TripContext.
// Cap component de l'app es trencarà, ja que fusionem l'estat i el dispatch sota el capó.
export function useTrip() {
  const state = useContext(TripStateContext);
  const dispatch = useContext(TripDispatchContext);

  if (state === undefined || dispatch === undefined) {
    throw new Error('useTrip must be used within a TripProvider');
  }

  // Reconstruïm l'objecte original
  return useMemo(() => ({
    ...state,
    actions: dispatch
  }), [state, dispatch]);
}

// 🚀 NOUS HOOKS OPTIMITZATS (Per utilitzar-los en els propers refactors)
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