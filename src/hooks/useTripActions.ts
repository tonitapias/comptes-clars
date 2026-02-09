// src/hooks/useTripActions.ts

import { useState } from 'react';
import { TripService } from '../services/tripService';
import { Settlement, Expense, Currency, TripData, TripUser } from '../types';
import { User } from 'firebase/auth';

export function useTripActions(tripId: string | undefined) {
  const [loadingAction, setLoadingAction] = useState(false);

  // Tipat genèric <T> per inferir correctament el retorn de cada acció
  const execute = async <T>(action: () => Promise<T>): Promise<{ success: boolean; data?: T; error?: string }> => {
    if (!tripId) return { success: false, error: "ID de viatge no trobat" };
    setLoadingAction(true);
    try {
      const data = await action();
      return { success: true, data };
    } catch (e: unknown) {
      // Gestió d'errors segura (sense 'any')
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "Error inesperat";
      return { success: false, error: errorMessage };
    } finally {
      setLoadingAction(false);
    }
  };

  return {
    loadingAction,
    
    addExpense: (expense: Omit<Expense, 'id'>) => 
      execute(() => TripService.addExpense(tripId!, expense)),
    
    updateExpense: (id: string, expense: Partial<Expense>) => 
      execute(() => TripService.updateExpense(tripId!, id, expense)),
    
    deleteExpense: (id: string) => 
      execute(() => TripService.deleteExpense(tripId!, id)),
    
    settleDebt: (settlement: Settlement, method: string) => 
      execute(() => TripService.settleDebt(tripId!, settlement, method)),
    
    updateTripSettings: (name: string, date: string, currency?: Currency) => 
      execute(async () => {
        const d = new Date(date);
        d.setHours(12, 0, 0, 0); // Evitem errors de zona horària
        
        // FIX: Tipat estricte Partial<TripData> en lloc de 'any'
        // Això evita enviar camps brossa a Firebase per error.
        const updateData: Partial<TripData> = { 
            name, 
            createdAt: d.toISOString() 
        };
        
        if (currency) {
            updateData.currency = currency;
        }
        
        await TripService.updateTrip(tripId!, updateData);
      }),

    joinTrip: (user: User) => 
      execute(() => TripService.joinTripViaLink(tripId!, user)),
    
    leaveTrip: async (userId: string, _currentBalance: number, isAuthUser: boolean, userUid?: string) => {
        return execute(async () => {
            if (isAuthUser && userUid) {
               // FIX: TripService.leaveTrip només accepta 2 arguments. 
               // L'argument 'currentBalance' sobrava i podia causar errors.
               await TripService.leaveTrip(tripId!, userId);
            }
        });
    }
  };
}