import React, { createContext, useContext, ReactNode } from 'react';
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

export function TripProvider({ children, tripId, currentUser }: TripProviderProps) {
  // 1. Data Fetching
  const { tripData, expenses, loading, error } = useTripData(tripId);

  // 2. Automatic Migration (Silent)
  useTripMigration(tripId, tripData);

  // 3. Actions Hook
  const actions = useTripActions(tripId);

  // 4. Derived State
  const isMember = !!(currentUser && tripData?.memberUids?.includes(currentUser.uid));

  const value = {
    tripId,
    tripData,
    expenses,
    loading,
    error,
    currentUser,
    isMember,
    actions
  };

  return (
    <TripContext.Provider value={value}>
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