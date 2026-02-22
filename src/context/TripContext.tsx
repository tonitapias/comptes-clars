// src/context/TripContext.tsx
import React, { createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
import { User } from 'firebase/auth';
import { useTripData } from '../hooks/useTripData';
import { useTripMigration } from '../hooks/useTripMigration';
import { useTripActions } from '../hooks/useTripActions';
import { TripData, Expense, unbrand } from '../types'; // [FIX]: Afegim la importació de 'unbrand'
import { calculateBalances } from '../services/billingService';
import { TripService } from '../services/tripService';

interface TripState {
  tripId: string | undefined;
  tripData: TripData | null;
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  currentUser: User | null;
  isMember: boolean;
  isOffline: boolean; 
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
  const { tripData, expenses, loading, error, isOffline } = useTripData(tripId);
  const actions = useTripActions(tripId);
  const isMember = !!(currentUser && tripData?.memberUids?.includes(currentUser.uid));

  // [RISC ZERO]: ELIMINADOR DE LECTURES MASSIVES (Free Tier Saver)
  // En lloc de fer N lectures cada cop que canvia una despesa, ho avaluem aquí 
  // perquè ja tenim les dades en memòria. Això protegeix Firestore.
  useEffect(() => {
    if (loading || !tripData || !tripId || isOffline) return;

    const balances = calculateBalances(expenses, tripData.users);
    
    // [FIX RISC ZERO]: Gràcies al nou 'billingService', ara podem exigir balanç estricte a 0.
    // Utilitzem unbrand() per avaluar el valor numèric real.
    const isSettledNow = balances.every(b => unbrand(b.amount) === 0);

    // Només disparem l'escriptura si hi ha un canvi REAL d'estat
    if (tripData.isSettled !== isSettledNow) {
      TripService.updateTripSettledState(tripId, isSettledNow).catch(err => {
        console.error("Error sincronitzant l'estat saldat del viatge:", err);
      });
    }
  }, [expenses, tripData?.users, tripData?.isSettled, loading, isOffline, tripId]);

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