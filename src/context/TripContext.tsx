import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { User } from 'firebase/auth';
import { useTripData } from '../hooks/useTripData';
import { useTripMigration } from '../hooks/useTripMigration';
import { useTripActions } from '../hooks/useTripActions';
import { TripData, Expense } from '../types';

// Definim la forma del Context
interface TripContextType {
  tripId: string | undefined;
  tripData: TripData | null;
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  currentUser: User | null;
  isMember: boolean;
  actions: ReturnType<typeof useTripActions>;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

interface TripProviderProps {
  children: ReactNode;
  tripId: string | undefined;
  currentUser: User | null;
}

// --- SUB-COMPONENT: Aïllament d'Efectes ---
// Separem la migració perquè un error aquí no bloquegi 
// immediatament la renderització del Provider.
// També compleix millor el principi de Responsabilitat Única.
const TripMigrator = React.memo(({ tripId, tripData }: { tripId: string | undefined, tripData: TripData | null }) => {
  useTripMigration(tripId, tripData);
  return null; // No renderitza res, només executa l'efecte
});

export function TripProvider({ children, tripId, currentUser }: TripProviderProps) {
  // 1. Data Fetching
  const { tripData, expenses, loading, error } = useTripData(tripId);

  // 2. Actions Hook
  const actions = useTripActions(tripId);

  // 3. Derived State (Calculat fora del memo per claredat, però inclòs a deps)
  const isMember = !!(currentUser && tripData?.memberUids?.includes(currentUser.uid));

  // 4. Memoització del Context Value (CRÍTIC PER RENDIMENT)
  // Evitem que tots els fills es renderitzin si l'objecte pare canvia però les dades no.
  const value = useMemo(() => ({
    tripId,
    tripData,
    expenses,
    loading,
    error,
    currentUser,
    isMember,
    actions
  }), [
    tripId, 
    tripData, 
    expenses, 
    loading, 
    error, 
    currentUser, 
    isMember, 
    actions
  ]);

  return (
    <TripContext.Provider value={value}>
      {/* Execució aïllada de la migració */}
      <TripMigrator tripId={tripId} tripData={tripData} />
      {children}
    </TripContext.Provider>
  );
}

// Hook consumidor personalitzat
export function useTrip() {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
}