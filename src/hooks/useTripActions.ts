import { useState } from 'react';
import { TripService } from '../services/tripService';
import { Settlement, Expense, CurrencyCode } from '../types';
import { User } from 'firebase/auth';

export function useTripActions(tripId: string | undefined) {
  const [loadingAction, setLoadingAction] = useState(false);

  // Wrapper segur per executar accions
  const execute = async <T>(action: () => Promise<T>, successMsg?: string): Promise<{ success: boolean; data?: T; error?: string }> => {
    if (!tripId) return { success: false, error: "No trip ID" };
    setLoadingAction(true);
    try {
      const data = await action();
      return { success: true, data };
    } catch (e: any) {
      console.error(e);
      return { success: false, error: e.message || "Error desconegut" };
    } finally {
      setLoadingAction(false);
    }
  };

  return {
    loadingAction,
    
    addExpense: (expense: any) => execute(() => TripService.addExpense(tripId!, expense)),
    
    updateExpense: (id: string, expense: any) => execute(() => TripService.updateExpense(tripId!, id, expense)),
    
    deleteExpense: (id: string) => execute(() => TripService.deleteExpense(tripId!, id)),
    
    settleDebt: (settlement: Settlement, method: string) => execute(() => TripService.settleDebt(tripId!, settlement, method)),
    
    updateTripSettings: (name: string, date: string, currency?: any) => execute(async () => {
      const d = new Date(date);
      d.setHours(12, 0, 0, 0);
      const updateData: any = { name, createdAt: d.toISOString() };
      if (currency) updateData.currency = currency;
      await TripService.updateTrip(tripId!, updateData);
    }),

    joinTrip: (user: User) => execute(() => TripService.joinTripViaLink(tripId!, user)),
    
    leaveTrip: async (userId: string, currentBalance: number, isAuthUser: boolean, userUid?: string) => {
        return execute(async () => {
             // Si és l'usuari actual autenticat
            if (isAuthUser && TripService.removeMemberAccess && userUid) {
               // Intentem sortir "bé" primer
               try {
                   await TripService.leaveTrip(tripId!, userId, currentBalance);
               } catch (e) {
                   // Si falla (ex: deute pendent), rellancem
                   throw e;
               }
            } else {
               // Fallback
               await TripService.leaveTrip(tripId!, userId, currentBalance);
            }
        });
    }
  };
}