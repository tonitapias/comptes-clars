// src/hooks/useTripActions.ts

import { useState } from 'react';
import { TripService } from '../services/tripService';
import { Settlement, Expense, Currency, TripData } from '../types';
import { User } from 'firebase/auth';

export function useTripActions(tripId: string | undefined) {
  const [loadingAction, setLoadingAction] = useState(false);

  const execute = async <T>(action: () => Promise<T>): Promise<{ success: boolean; data?: T; error?: string }> => {
    if (!tripId) return { success: false, error: "ID de viatge no trobat" };
    setLoadingAction(true);
    try {
      const data = await action();
      return { success: true, data };
    } catch (e: unknown) {
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
        d.setHours(12, 0, 0, 0); 
        
        const updateData: Partial<TripData> = { 
            name, 
            createdAt: d.toISOString() 
        };
        
        if (currency) {
            updateData.currency = currency;
        }
        
        await TripService.updateTrip(tripId!, updateData);
      }),

    // --- ACCIÓ NOVA: ESBORRAR PROJECTE ---
    deleteTrip: () => 
      execute(async () => {
         await TripService.deleteTrip(tripId!);
      }),

    joinTrip: (user: User) => 
      execute(() => TripService.joinTripViaLink(tripId!, user)),
    
    // --- LÒGICA MILLORADA: PROTECCIÓ CONTRA DEUTES ---
    leaveTrip: async (userId: string, currentBalance: number, isAuthUser: boolean, userUid?: string) => {
        return execute(async () => {
            if (isAuthUser && userUid) {
               // VALIDACIÓ: No permetem sortir si el balanç no és quasi zero (marge 10 cèntims)
               if (Math.abs(currentBalance) > 10) {
                 throw new Error("No pots sortir del grup si tens deutes pendents o diners per recuperar. Primer has de liquidar el teu saldo.");
               }

               await TripService.leaveTrip(tripId!, userId);
            }
        });
    }
  };
}