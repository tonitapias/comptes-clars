import { useState } from 'react';
import { TripService } from '../services/tripService';
import { Settlement, Expense, Currency, TripUser } from '../types';
import { User } from 'firebase/auth';

export function useTripActions(tripId: string | undefined) {
  const [loadingAction, setLoadingAction] = useState(false);

  const execute = async <T>(action: () => Promise<T>): Promise<{ success: boolean; data?: T; error?: string }> => {
    if (!tripId) return { success: false, error: "ID de viatge no trobat" };
    setLoadingAction(true);
    try {
      const data = await action();
      return { success: true, data };
    } catch (e: any) {
      console.error(e);
      return { success: false, error: e.message || "Error inesperat" };
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
        const updateData: any = { name, createdAt: d.toISOString() };
        if (currency) updateData.currency = currency;
        await TripService.updateTrip(tripId!, updateData);
      }),

    joinTrip: (user: User) => 
      execute(() => TripService.joinTripViaLink(tripId!, user)),
    
    leaveTrip: async (userId: string, currentBalance: number, isAuthUser: boolean, userUid?: string) => {
        return execute(async () => {
            if (isAuthUser && userUid) {
               await TripService.leaveTrip(tripId!, userId, currentBalance);
               // Lògica addicional de desvinculació de permisos si cal
            }
        });
    }
  };
}