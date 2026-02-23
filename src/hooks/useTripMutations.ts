// src/hooks/useTripMutations.ts
import { useTranslation } from 'react-i18next';
import { parseAppError } from '../utils/errorHandler';
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripState, useTripDispatch } from '../context/TripContext';
import { ToastType } from '../components/Toast';
import { calculateBalances, canUserLeaveTrip, getUserBalance } from '../services/billingService'; 
import { Currency, Settlement, Payment, Balance, unbrand, Expense } from '../types'; 
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

  // [MILLORA RISC ZERO]: Centralitzem i fem més robust el comportament offline amb i18n
  const requireOnlineForCritical = useCallback((): boolean => {
    if (isOffline) {
      showToast(t('COMMON.OFFLINE_CRITICAL_ERROR', "Acció denegada: Necessites connexió per a canvis crítics."), 'error');
      return false;
    }
    return true;
  }, [isOffline, showToast, t]);

  const notifySuccess = useCallback((msg: string) => {
    if (isOffline) {
      showToast(`${msg} ${t('COMMON.OFFLINE_PENDING', '(Desat localment, pendent de xarxa)')}`, 'warning');
    } else {
      showToast(msg, 'success');
    }
  }, [isOffline, showToast, t]);

  // [MILLORA RISC ZERO]: try/catch aïllat per evitar bloquejar l'acció principal
  const evaluateSettledState = useCallback(async (updatedExpenses: Expense[], updatedPayments: Payment[]) => {
    if (!tripData) return;
    try {
      const newBalances = calculateBalances(updatedExpenses, tripData.users, updatedPayments);
      const isSettledNow = newBalances.every(b => Math.abs(unbrand(b.amount)) < BUSINESS_RULES.SETTLED_TOLERANCE_MARGIN);
      
      if (tripData.isSettled !== isSettledNow) {
        await TripService.updateTripSettledState(tripData.id, isSettledNow);
      }
    } catch (error) {
      console.error("[EvaluateSettledState Error]: Error no bloquejant al calcular l'estat saldat.", error);
    }
  }, [tripData]);

  const updateTripSettings = useCallback(async (name: string, currency: Currency) => {
    try {
      await actions.updateTripSettings(name, new Date().toISOString(), currency);
      notifySuccess(t(currency ? 'ACTIONS.UPDATE_SETTINGS_SUCCESS' : 'ACTIONS.UPDATE_NAME_SUCCESS', currency ? LITERALS.ACTIONS.UPDATE_SETTINGS_SUCCESS : LITERALS.ACTIONS.UPDATE_NAME_SUCCESS));
      return true;
    } catch (e: unknown) { 
      showToast(parseAppError(e, t), 'error'); 
      return false;
    }
  }, [actions, showToast, t, notifySuccess]); 

  const settleDebt = useCallback(async (settlement: Settlement, method: Payment['method'] = 'manual') => {
    if (!tripData) return false;

    try {
      const res = await actions.settleDebt(settlement, method);

      if (res.success) {
        const simulatedPayment: Payment = {
          id: `temp-${Date.now()}`,
          from: settlement.from,
          to: settlement.to,
          amount: settlement.amount,
          date: new Date().toISOString(),
          method
        };
        
        const newPayments = [...(tripData.payments || []), simulatedPayment];
        await evaluateSettledState(expenses, newPayments);

        notifySuccess(t('ACTIONS.SETTLE_SUCCESS', 'Deute saldat correctament'));
        return true;
      } else {
        showToast(res.error || t('ACTIONS.SETTLE_ERROR', LITERALS.ACTIONS.SETTLE_ERROR), 'error');
        return false;
      }
    } catch (e: unknown) { 
      console.error("[SettleDebt Error]:", e);
      showToast(parseAppError(e, t), 'error');
      return false;
    }
  }, [actions, showToast, t, expenses, tripData, notifySuccess, evaluateSettledState]); 

  const deleteExpense = useCallback(async (id: string) => {
    if (!tripData) return false;

    try {
      const isPayment = tripData.payments?.some(p => p.id === id);

      if (isPayment) {
        await TripService.deletePayment(tripData.id, id, tripData.payments!);
        const newPayments = tripData.payments!.filter(p => p.id !== id);
        await evaluateSettledState(expenses, newPayments);

        notifySuccess(t('ACTIONS.CANCEL_SETTLEMENT_SUCCESS', 'Liquidació anul·lada correctament'));
        return true;
      }

      const res = await actions.deleteExpense(id);
      if (res.success) {
        const newExpenses = expenses.filter(e => e.id !== id);
        await evaluateSettledState(newExpenses, tripData.payments || []);

        notifySuccess(t('ACTIONS.DELETE_EXPENSE_SUCCESS', LITERALS.ACTIONS.DELETE_EXPENSE_SUCCESS));
        return true;
      } else {
        showToast(res.error || t('ACTIONS.DELETE_EXPENSE_ERROR', LITERALS.ACTIONS.DELETE_EXPENSE_ERROR), 'error');
        return false;
      }
    } catch (e: unknown) { 
      console.error("[DeleteExpense Error]:", e);
      showToast(parseAppError(e, t), 'error');
      return false;
    }
  }, [actions, showToast, t, expenses, tripData, notifySuccess, evaluateSettledState]); 

  const leaveTrip = useCallback(async (targetTripId?: string) => {
    if (!requireOnlineForCritical() || !currentUser) return;

    const idToLeave = targetTripId || tripData?.id;
    if (!idToLeave) return;

    try {
      let currentTripUsers = tripData?.users || [];
      let currentBalances: Balance[] = [];
      let isOwner = false;

      if (tripData && tripData.id === idToLeave) {
        currentBalances = calculateBalances(expenses, currentTripUsers, tripData.payments || []);
        isOwner = tripData.ownerId === currentUser.uid;
      } else {
        const fetchedTrip = await TripService.getTrip(idToLeave);
        if (!fetchedTrip) {
           showToast(t('ERRORS.TRIP_NOT_FOUND', "No s'ha trobat el viatge"), "error");
           return;
        }
        const fetchedExpenses = await TripService.getTripExpenses(idToLeave);
        currentTripUsers = fetchedTrip.users;
        currentBalances = calculateBalances(fetchedExpenses, currentTripUsers, fetchedTrip.payments || []);
        isOwner = fetchedTrip.ownerId === currentUser.uid;
      }

      const myUser = currentTripUsers.find(u => u.linkedUid === currentUser.uid);

      if (isOwner && currentTripUsers.filter(u => !u.isDeleted).length <= 1) {
          showToast(t('ERRORS.LAST_MEMBER_ACTIVE', "Ets l'últim membre actiu. Elimina el projecte sencer a 'Configuració'."), "warning");
          return;
      }

      if (!canUserLeaveTrip(myUser?.id, currentBalances, BUSINESS_RULES.MAX_LEAVE_BALANCE_MARGIN)) {
        showToast(t('ERRORS.CANNOT_LEAVE_DEBTS', "No pots sortir del viatge fins que no saldis els teus deutes o et paguin el que et deuen."), "error");
        return;
      }

      const myBalanceAmount = unbrand(getUserBalance(myUser?.id, currentBalances)); 

      const res = await actions.leaveTrip(
        myUser ? myUser.id : currentUser.uid,
        myBalanceAmount,
        !!myUser,
        currentUser.uid
      );

      if (res.success) {
        showToast(t('ACTIONS.LEAVE_TRIP_SUCCESS', "Has abandonat el viatge correctament."), "success");
        if (tripData?.id === idToLeave) {
          localStorage.removeItem('cc-last-trip-id');
          navigate('/');
        }
      } else {
        showToast(res.error || t('ERRORS.LEAVE_TRIP_FAILED', "No s'ha pogut sortir del viatge"), 'error');
      }
    } catch (e: unknown) {
      showToast(parseAppError(e, t), 'error');
    }
  }, [actions, currentUser, tripData, expenses, navigate, showToast, t, requireOnlineForCritical]); 

  const joinTrip = useCallback(async () => {
     if (!requireOnlineForCritical()) return;

     if(!currentUser) return;
     try {
         await actions.joinTrip(currentUser);
         showToast(t('ACTIONS.JOIN_TRIP_SUCCESS', LITERALS.ACTIONS.JOIN_TRIP_SUCCESS));
     } catch(e: unknown) { 
         showToast(parseAppError(e, t), 'error');
     }
  }, [actions, currentUser, showToast, t, requireOnlineForCritical]); 

  const deleteTrip = useCallback(async () => {
    if (!requireOnlineForCritical()) return;

    if (!tripData || !currentUser) return;

    const isOwner = Boolean(
        currentUser.uid && (
            tripData.ownerId === currentUser.uid || 
            tripData.memberUids?.[0] === currentUser.uid
        )
    );
    
    if (!isOwner) {
        showToast(t('ERRORS.ONLY_OWNER_CAN_DELETE', "Accés denegat: Només el creador pot eliminar el projecte sencer."), 'error');
        return; 
    }

    try {
      await actions.deleteTrip();
      showToast(t('ACTIONS.DELETE_TRIP_SUCCESS', LITERALS.ACTIONS.DELETE_TRIP_SUCCESS));
      localStorage.removeItem('cc-last-trip-id');
      navigate('/');
    } catch (e: unknown) { 
      console.error(e);
      showToast(parseAppError(e, t), 'error'); 
    }
  }, [actions, navigate, showToast, t, tripData, currentUser, requireOnlineForCritical]); 

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