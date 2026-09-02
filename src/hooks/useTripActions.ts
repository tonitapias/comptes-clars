// src/hooks/useTripActions.ts

import { useState } from 'react';
import { useTranslation } from 'react-i18next'; 
import { TripService } from '../services/tripService';
import { Settlement, Expense, Currency, TripData } from '../types';
import { User } from 'firebase/auth';
import { parseAppError } from '../utils/errorHandler'; 
import { BUSINESS_RULES } from '../config/businessRules'; // [NOU] Importem les regles de negoci

export function useTripActions(tripId: string | undefined) {
  const [loadingAction, setLoadingAction] = useState(false);
  const { t } = useTranslation(); 

  const execute = async <T>(action: () => Promise<T>): Promise<{ success: boolean; data?: T; error?: string }> => {
    if (!tripId) return { success: false, error: t('ERRORS.NOT_FOUND', "ID de viatge no trobat") }; 
    
    setLoadingAction(true);
    try {
      const data = await action();
      return { success: true, data };
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = parseAppError(e, t);
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

    deleteTrip: () => 
      execute(async () => {
         await TripService.deleteTrip(tripId!);
      }),

    joinTrip: (user: User) =>
      execute(() => TripService.joinTripViaLink(tripId!, user)),

    // Sortida voluntària de l'usuari autenticat que executa l'acció.
    leaveTrip: (userId: string, currentBalanceCents: number) => {
        return execute(async () => {
            if (Math.abs(currentBalanceCents) > BUSINESS_RULES.MAX_LEAVE_BALANCE_MARGIN) {
               const tipusDeute = currentBalanceCents > 0 ? "tens diners per recuperar" : "tens deutes pendents";
               throw new Error(`No pots sortir del grup: ${tipusDeute}. Primer has de liquidar el teu saldo (Balanç actual: ${(currentBalanceCents/100).toFixed(2)}€).`);
            }

            await TripService.leaveTrip(tripId!, userId);
        });
    },

    // Un membre n'expulsa un ALTRE (acció diferent de `leaveTrip`: aquí l'uid a
    // treure de `memberUids` és el del membre expulsat, no el de qui executa
    // l'acció). El component crida `canUserLeaveTrip` abans de trucar això
    // perquè el missatge de "encara et deu diners" surti sense arribar a Firestore.
    removeMember: (targetUserId: string) =>
      execute(() => TripService.removeMember(tripId!, targetUserId))
  };
}