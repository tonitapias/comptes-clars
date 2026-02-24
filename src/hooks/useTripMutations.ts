// src/hooks/useTripMutations.ts
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { parseAppError } from '../utils/errorHandler';
import { useTripMeta, useTripExpenses, useTripDispatch } from '../context/TripContext';
import { ToastType } from '../components/Toast';
import { calculateBalances, canUserLeaveTrip, getUserBalance } from '../services/billingService'; 
import { Currency, Settlement, Payment, Expense, PaymentMethodId, TripData, unbrand } from '../types'; 
import { LITERALS } from '../constants/literals';
import { BUSINESS_RULES } from '../config/businessRules';
import { TripService } from '../services/tripService';

// --- DICCIONARI DE FALLBACKS D'ERROR ---
const LEAVE_ERRORS_FALLBACK: Record<string, string> = {
  'ERRORS.TRIP_NOT_FOUND': "No s'ha trobat el viatge",
  'ERRORS.LAST_MEMBER_ACTIVE': "Ets l'últim membre actiu. Elimina el projecte sencer a 'Configuració'.",
  'ERRORS.CANNOT_LEAVE_DEBTS': "No pots sortir del viatge fins que no saldis els teus deutes o et paguin el que et deuen."
};

// ============================================================================
// LÒGICA DE NEGOCI PURA (Desacoblada de React - Fàcilment Testejable)
// ============================================================================

const isUserOwner = (tripData: TripData, userId: string): boolean => {
  return tripData.ownerId === userId || tripData.memberUids?.[0] === userId;
};

// [FASE 2 MILLORA]: Centralitzem les regles de negoci fora del cicle de vida de React
async function validateAndPrepareLeave(
  targetTripId: string,
  currentUserUid: string,
  localTripData: TripData | null,
  localExpenses: Expense[]
) {
  let tripUsers = localTripData?.users || [];
  let balances = [];
  let isOwner = false;

  // 1. Resolució de dades (Local vs Remot)
  if (localTripData && localTripData.id === targetTripId) {
    balances = calculateBalances(localExpenses, tripUsers, localTripData.payments || []);
    isOwner = isUserOwner(localTripData, currentUserUid);
  } else {
    const fetchedTrip = await TripService.getTrip(targetTripId);
    if (!fetchedTrip) throw new Error('ERRORS.TRIP_NOT_FOUND');
    
    const fetchedExpenses = await TripService.getTripExpenses(targetTripId);
    tripUsers = fetchedTrip.users;
    balances = calculateBalances(fetchedExpenses, tripUsers, fetchedTrip.payments || []);
    isOwner = isUserOwner(fetchedTrip, currentUserUid);
  }

  // 2. Avaluació de regles de negoci
  const myUser = tripUsers.find(u => u.linkedUid === currentUserUid);
  
  if (isOwner && tripUsers.filter(u => !u.isDeleted).length <= 1) {
    throw new Error('ERRORS.LAST_MEMBER_ACTIVE');
  }

  if (!canUserLeaveTrip(myUser?.id, balances, BUSINESS_RULES.MAX_LEAVE_BALANCE_MARGIN)) {
    throw new Error('ERRORS.CANNOT_LEAVE_DEBTS');
  }

  // 3. Preparació de l'acció
  const myBalanceAmount = unbrand(getUserBalance(myUser?.id, balances));

  return {
    internalUserId: myUser ? myUser.id : currentUserUid,
    myBalanceAmount,
    isLinked: !!myUser
  };
}

// ============================================================================
// HOOK D'ORQUESTRACIÓ DE LA UI
// ============================================================================

export function useTripMutations() {
  const navigate = useNavigate();
  const { t } = useTranslation(); 
  
  const { tripData, currentUser, isOffline } = useTripMeta();
  const { expenses } = useTripExpenses();
  const actions = useTripDispatch();
  
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);

  // --- Helpers de UI ---
  const showToast = useCallback((msg: string, type: ToastType = 'success') => setToast({ msg, type }), []);
  const clearToast = useCallback(() => setToast(null), []);

  const notifySuccess = useCallback((msg: string) => {
    showToast(isOffline ? `${msg} ${t('COMMON.OFFLINE_PENDING', '(Desat localment)')}` : msg, isOffline ? 'warning' : 'success');
  }, [isOffline, showToast, t]);

  const requireOnlineForCritical = useCallback((): boolean => {
    if (isOffline) {
      showToast(t('COMMON.OFFLINE_CRITICAL_ERROR', "Acció denegada: Necessites connexió per a canvis crítics."), 'error');
      return false;
    }
    return true;
  }, [isOffline, showToast, t]);

  // --- Mutacions de suport ---
  const evaluateSettledState = useCallback(async (updatedExpenses: Expense[], updatedPayments: Payment[]) => {
    if (!tripData?.id || !tripData?.users) return;
    try {
      const newBalances = calculateBalances(updatedExpenses, tripData.users, updatedPayments);
      const isSettledNow = newBalances.every(b => Math.abs(unbrand(b.amount)) < BUSINESS_RULES.SETTLED_TOLERANCE_MARGIN);
      
      if (tripData.isSettled !== isSettledNow) {
        TripService.updateTripSettledState(tripData.id, isSettledNow).catch(err => {
            console.warn("[Background Sync] Error actualitzant l'estat saldat", err);
        });
      }
    } catch (error) {
      console.error("[EvaluateSettledState Error]: Error al calcular l'estat saldat.", error);
    }
  }, [tripData?.id, tripData?.users, tripData?.isSettled]);

  // --- Mutacions Principals ---
  
  const updateTripSettings = useCallback(async (name: string, currency: Currency) => {
    try {
      await actions.updateTripSettings(name, new Date().toISOString(), currency);
      const isCurrencyUpdate = Boolean(currency);
      notifySuccess(t(isCurrencyUpdate ? 'ACTIONS.UPDATE_SETTINGS_SUCCESS' : 'ACTIONS.UPDATE_NAME_SUCCESS'));
      return true;
    } catch (e: unknown) { 
      showToast(parseAppError(e, t), 'error'); 
      return false;
    }
  }, [actions, showToast, t, notifySuccess]); 

  const settleDebt = useCallback(async (settlement: Settlement, method: PaymentMethodId = 'manual') => {
    if (!tripData) return false;
    try {
      const res = await actions.settleDebt(settlement, method);
      if (res.success) {
        const simulatedPayment: Payment = {
          id: `temp-${Date.now()}`, from: settlement.from, to: settlement.to, amount: settlement.amount, date: new Date().toISOString(), method
        };
        await evaluateSettledState(expenses, [...(tripData.payments || []), simulatedPayment]);
        notifySuccess(t('ACTIONS.SETTLE_SUCCESS', 'Deute saldat correctament'));
        return true;
      }
      showToast(res.error || t('ACTIONS.SETTLE_ERROR', LITERALS.ACTIONS.SETTLE_ERROR), 'error');
      return false;
    } catch (e: unknown) { 
      showToast(parseAppError(e, t), 'error'); return false;
    }
  }, [actions, showToast, t, expenses, tripData, notifySuccess, evaluateSettledState]); 

  const deleteExpense = useCallback(async (id: string) => {
    if (!tripData) return false;
    try {
      const res = await actions.deleteExpense(id);
      if (res.success) {
        await evaluateSettledState(expenses.filter(e => e.id !== id), tripData.payments || []);
        notifySuccess(t('ACTIONS.DELETE_EXPENSE_SUCCESS', LITERALS.ACTIONS.DELETE_EXPENSE_SUCCESS));
        return true;
      }
      showToast(res.error || t('ACTIONS.DELETE_EXPENSE_ERROR', LITERALS.ACTIONS.DELETE_EXPENSE_ERROR), 'error');
      return false;
    } catch (e: unknown) { 
      showToast(parseAppError(e, t), 'error'); return false;
    }
  }, [actions, showToast, t, expenses, tripData, notifySuccess, evaluateSettledState]); 

  const deletePayment = useCallback(async (id: string) => {
    if (!tripData) return false;
    try {
      const currentPayments = tripData.payments || [];
      await TripService.deletePayment(tripData.id, id, currentPayments);
      await evaluateSettledState(expenses, currentPayments.filter(p => p.id !== id));
      notifySuccess(t('ACTIONS.CANCEL_SETTLEMENT_SUCCESS', 'Liquidació anul·lada correctament'));
      return true;
    } catch (e: unknown) { 
      showToast(parseAppError(e, t), 'error'); return false;
    }
  }, [showToast, t, expenses, tripData, notifySuccess, evaluateSettledState]);

  // [FASE 1 FIX]: Canviem 'any' per 'unknown' i fem la comprovació tipada
  const leaveTrip = useCallback(async (targetTripId?: string) => {
    if (!requireOnlineForCritical() || !currentUser) return;
    const idToLeave = targetTripId || tripData?.id;
    if (!idToLeave) return;

    try {
      // 1. Demanem les instruccions a la funció pura de domini
      const { internalUserId, myBalanceAmount, isLinked } = await validateAndPrepareLeave(
        idToLeave, currentUser.uid, tripData, expenses
      );

      // 2. Executem l'acció real
      const res = await actions.leaveTrip(internalUserId, myBalanceAmount, isLinked, currentUser.uid);

      // 3. Responem a la UI
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
      // Ara interceptem l'error de forma segura
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (LEAVE_ERRORS_FALLBACK[errorMessage]) {
        showToast(t(errorMessage, LEAVE_ERRORS_FALLBACK[errorMessage]), 'error');
      } else {
        showToast(parseAppError(e, t), 'error');
      }
    }
  }, [actions, currentUser, tripData, expenses, navigate, showToast, t, requireOnlineForCritical]); 
  
  const joinTrip = useCallback(async () => {
     if (!requireOnlineForCritical() || !currentUser) return;
     try {
         await actions.joinTrip(currentUser);
         notifySuccess(t('ACTIONS.JOIN_TRIP_SUCCESS', LITERALS.ACTIONS.JOIN_TRIP_SUCCESS));
     } catch(e: unknown) { 
         showToast(parseAppError(e, t), 'error');
     }
  }, [actions, currentUser, showToast, t, requireOnlineForCritical, notifySuccess]); 

  const deleteTrip = useCallback(async () => {
    if (!requireOnlineForCritical() || !tripData || !currentUser) return;
    if (!isUserOwner(tripData, currentUser.uid)) {
        showToast(t('ERRORS.ONLY_OWNER_CAN_DELETE', "Accés denegat: Només el creador pot eliminar el projecte sencer."), 'error');
        return; 
    }
    try {
      await actions.deleteTrip();
      showToast(t('ACTIONS.DELETE_TRIP_SUCCESS', LITERALS.ACTIONS.DELETE_TRIP_SUCCESS));
      localStorage.removeItem('cc-last-trip-id');
      navigate('/');
    } catch (e: unknown) { 
      showToast(parseAppError(e, t), 'error'); 
    }
  }, [actions, navigate, showToast, t, tripData, currentUser, requireOnlineForCritical]); 

  const memoizedMutations = useMemo(() => ({
    updateTripSettings, settleDebt, deleteExpense, deletePayment, leaveTrip, joinTrip, deleteTrip
  }), [updateTripSettings, settleDebt, deleteExpense, deletePayment, leaveTrip, joinTrip, deleteTrip]);

  return { toast, showToast, clearToast, mutations: memoizedMutations };
}