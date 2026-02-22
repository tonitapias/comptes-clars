// src/hooks/useTripMutations.ts
import { useTranslation } from 'react-i18next';
import { parseAppError } from '../utils/errorHandler';
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripState, useTripDispatch } from '../context/TripContext';
import { ToastType } from '../components/Toast';
import { calculateBalances, canUserLeaveTrip, getUserBalance } from '../services/billingService'; 
import { Currency, Settlement, Payment, Balance, unbrand } from '../types'; 
import { LITERALS } from '../constants/literals';
import { BUSINESS_RULES } from '../config/businessRules';
import { TripService } from '../services/tripService'; 

export function useTripMutations() {
  const navigate = useNavigate();
  const { t } = useTranslation(); 
  
  const { tripData, currentUser, expenses, isOffline } = useTripState();
  const actions = useTripDispatch();
  
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);

  const showToast = useCallback((msg: string, type: ToastType = 'success') => setToast({ msg, type }), []);
  const clearToast = useCallback(() => setToast(null), []);

  const ensureOnline = useCallback((): boolean => {
    if (isOffline) {
      showToast("Acció no permesa sense connexió a Internet.", 'warning');
      return false;
    }
    return true;
  }, [isOffline, showToast]);

  const updateTripSettings = useCallback(async (name: string, currency: Currency) => {
    if (!ensureOnline()) return false;

    try {
      await actions.updateTripSettings(name, new Date().toISOString(), currency);
      showToast(currency ? LITERALS.ACTIONS.UPDATE_SETTINGS_SUCCESS : LITERALS.ACTIONS.UPDATE_NAME_SUCCESS);
      return true;
    } catch (e: unknown) { 
      showToast(parseAppError(e, t), 'error'); 
      return false;
    }
  }, [actions, showToast, t, ensureOnline]); 

  const settleDebt = useCallback(async (settlement: Settlement, method: Payment['method'] = 'manual') => {
    if (!ensureOnline() || !tripData) return false;

    try {
      const res = await actions.settleDebt(settlement, method);

      if (res.success) {
        const optimisticPayment: Payment = {
          id: `temp-${Date.now()}`,
          from: settlement.from,
          to: settlement.to,
          amount: settlement.amount,
          date: new Date().toISOString(),
          method
        };
        
        const newPayments = [...(tripData.payments || []), optimisticPayment];
        const newBalances = calculateBalances(expenses, tripData.users, newPayments);
        const isSettledNow = newBalances.every(b => Math.abs(unbrand(b.amount)) < 2);
        
        if (tripData.isSettled !== isSettledNow) {
          await TripService.updateTripSettledState(tripData.id, isSettledNow).catch(console.error);
        }

        showToast(t('ACTIONS.SETTLE_SUCCESS', 'Deute saldat correctament'), 'success');
        return true;
      } else {
        showToast(res.error || LITERALS.ACTIONS.SETTLE_ERROR, 'error');
        return false;
      }
    } catch (e: unknown) { 
      console.error(e);
      showToast(parseAppError(e, t), 'error');
      return false;
    }
  }, [actions, showToast, t, ensureOnline, expenses, tripData]); 

  const deleteExpense = useCallback(async (id: string) => {
    if (!ensureOnline() || !tripData) return false;

    try {
      const isPayment = tripData.payments?.some(p => p.id === id);

      if (isPayment) {
        // [FIX CRÍTIC]: Cridem la nova funció que guarda el log correcte
        await TripService.deletePayment(tripData.id, id, tripData.payments!);

        const newPayments = tripData.payments!.filter(p => p.id !== id);
        const newBalances = calculateBalances(expenses, tripData.users, newPayments);
        const isSettledNow = newBalances.every(b => Math.abs(unbrand(b.amount)) < 2);
        
        if (tripData.isSettled !== isSettledNow) {
          await TripService.updateTripSettledState(tripData.id, isSettledNow).catch(console.error);
        }

        showToast('Liquidació anul·lada correctament', 'success');
        return true;
      }

      // El flux original per esborrar despeses
      const res = await actions.deleteExpense(id);
      if (res.success) {
        const newExpenses = expenses.filter(e => e.id !== id);
        const newBalances = calculateBalances(newExpenses, tripData.users, tripData.payments || []);
        const isSettledNow = newBalances.every(b => Math.abs(unbrand(b.amount)) < 2);
        
        if (tripData.isSettled !== isSettledNow) {
          await TripService.updateTripSettledState(tripData.id, isSettledNow).catch(console.error);
        }

        showToast(LITERALS.ACTIONS.DELETE_EXPENSE_SUCCESS, 'success');
        return true;
      } else {
        showToast(res.error || LITERALS.ACTIONS.DELETE_EXPENSE_ERROR, 'error');
        return false;
      }
    } catch (e: unknown) { 
      showToast(parseAppError(e, t), 'error');
      return false;
    }
  }, [actions, showToast, t, ensureOnline, expenses, tripData]); 

  const leaveTrip = useCallback(async (targetTripId?: string) => {
    if (!ensureOnline() || !currentUser) return;

    const idToLeave = targetTripId || tripData?.id;
    if (!idToLeave) return;

    try {
      let currentTripUsers = tripData?.users || [];
      let currentBalances: Balance[] = [];

      if (tripData && tripData.id === idToLeave) {
        currentBalances = calculateBalances(expenses, currentTripUsers, tripData.payments || []);
      } else {
        const fetchedTrip = await TripService.getTrip(idToLeave);
        if (!fetchedTrip) {
           showToast("No s'ha trobat el viatge", "error");
           return;
        }
        const fetchedExpenses = await TripService.getTripExpenses(idToLeave);
        currentTripUsers = fetchedTrip.users;
        currentBalances = calculateBalances(fetchedExpenses, currentTripUsers, fetchedTrip.payments || []);
      }

      const myUser = currentTripUsers.find(u => u.linkedUid === currentUser.uid);

      if (!canUserLeaveTrip(myUser?.id, currentBalances, BUSINESS_RULES.MAX_LEAVE_BALANCE_MARGIN)) {
        showToast("No pots sortir del viatge fins que no saldis els teus deutes o et paguin el que et deuen.", "error");
        return;
      }

      const myBalanceAmount = getUserBalance(myUser?.id, currentBalances); 

      const res = await actions.leaveTrip(
        myUser ? myUser.id : currentUser.uid,
        myBalanceAmount,
        !!myUser,
        currentUser.uid
      );

      if (res.success) {
        showToast("Has abandonat el viatge correctament.", "success");
        if (tripData?.id === idToLeave) {
          localStorage.removeItem('cc-last-trip-id');
          navigate('/');
        }
      } else {
        showToast(res.error || "No s'ha pogut sortir del viatge", 'error');
      }
    } catch (e: unknown) {
      showToast(parseAppError(e, t), 'error');
    }
  }, [actions, currentUser, tripData, expenses, navigate, showToast, t, ensureOnline]); 

  const joinTrip = useCallback(async () => {
     if (!ensureOnline()) return;

     if(!currentUser) return;
     try {
         await actions.joinTrip(currentUser);
         showToast(LITERALS.ACTIONS.JOIN_TRIP_SUCCESS);
     } catch(e: unknown) { 
         showToast(parseAppError(e, t), 'error');
     }
  }, [actions, currentUser, showToast, t, ensureOnline]); 

  const deleteTrip = useCallback(async () => {
    if (!ensureOnline()) return;

    if (!tripData || !currentUser) return;

    const isOwner = Boolean(
        currentUser.uid && (
            tripData.ownerId === currentUser.uid || 
            tripData.memberUids?.[0] === currentUser.uid
        )
    );
    
    if (!isOwner) {
        showToast("Accés denegat: Només el creador pot eliminar el projecte sencer.", 'error');
        return; 
    }

    try {
      await actions.deleteTrip();
      showToast(LITERALS.ACTIONS.DELETE_TRIP_SUCCESS);
      localStorage.removeItem('cc-last-trip-id');
      navigate('/');
    } catch (e: unknown) { 
      console.error(e);
      showToast(parseAppError(e, t), 'error'); 
    }
  }, [actions, navigate, showToast, t, tripData, currentUser, ensureOnline]); 

  const memoizedMutations = useMemo(() => ({
    updateTripSettings,
    settleDebt,
    deleteExpense,
    leaveTrip,
    joinTrip,
    deleteTrip
  }), [updateTripSettings, settleDebt, deleteExpense, leaveTrip, joinTrip, deleteTrip]);

  return {
    toast,
    showToast,
    clearToast,
    mutations: memoizedMutations
  };
}