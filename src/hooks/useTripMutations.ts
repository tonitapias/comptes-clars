// src/hooks/useTripMutations.ts
import { useTranslation } from 'react-i18next';
import { parseAppError } from '../utils/errorHandler';
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripState, useTripDispatch } from '../context/TripContext';
import { ToastType } from '../components/Toast';
import { calculateBalances, canUserLeaveTrip, getUserBalance } from '../services/billingService'; 
import { Currency, CategoryId, SplitType, Settlement, Payment } from '../types'; 
import { LITERALS } from '../constants/literals';
import { BUSINESS_RULES } from '../config/businessRules';

const SETTLEMENT_CATEGORY: CategoryId = 'transfer';
const SETTLEMENT_SPLIT_TYPE: SplitType = 'equal';

export function useTripMutations() {
  const navigate = useNavigate();
  const { t } = useTranslation(); 
  
  const { tripData, currentUser, expenses, isOffline } = useTripState();
  const actions = useTripDispatch();
  
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);

  const showToast = useCallback((msg: string, type: ToastType = 'success') => setToast({ msg, type }), []);
  const clearToast = useCallback(() => setToast(null), []);

  const updateTripSettings = useCallback(async (name: string, currency: Currency) => {
    if (isOffline) {
      showToast("Acció no permesa sense connexió a Internet.", 'warning');
      return false;
    }

    try {
      await actions.updateTripSettings(name, new Date().toISOString(), currency);
      showToast(currency ? LITERALS.ACTIONS.UPDATE_SETTINGS_SUCCESS : LITERALS.ACTIONS.UPDATE_NAME_SUCCESS);
      return true;
    } catch (e: unknown) { 
      showToast(parseAppError(e, t), 'error'); 
      return false;
    }
  }, [actions, showToast, t, isOffline]); 

  const settleDebt = useCallback(async (settlement: Settlement, method: Payment['method'] = 'manual') => {
    if (isOffline) {
      showToast("Acció no permesa sense connexió a Internet.", 'warning');
      return false;
    }

    try {
      // [REFACTOR ZERO RISC]: Obtenim el títol net del mètode directament de les traduccions o fallback.
      // Sense diccionaris hardcodejats ni manipulacions d'strings de la UI.
      const customTitle = t(`MODALS.PAYMENT_METHODS.${method.toUpperCase()}`, method);

      const expenseData = {
        title: customTitle,
        amount: settlement.amount, 
        payer: settlement.from,    
        involved: [settlement.to], 
        category: SETTLEMENT_CATEGORY,
        date: new Date().toISOString(),
        splitType: SETTLEMENT_SPLIT_TYPE
      };

      const res = await actions.addExpense(expenseData);

      if (res.success) {
        // [REFACTOR ZERO RISC]: Missatge d'èxit net i traduït directament
        showToast(t('ACTIONS.SETTLE_SUCCESS', 'Deute saldat correctament'), 'success');
        return true;
      } else {
        showToast(LITERALS.ACTIONS.SETTLE_ERROR, 'error');
        return false;
      }
    } catch (e: unknown) { 
      console.error(e);
      showToast(parseAppError(e, t), 'error');
      return false;
    }
  }, [actions, showToast, t, isOffline]); 

  const deleteExpense = useCallback(async (id: string) => {
    if (isOffline) {
      showToast("Acció no permesa sense connexió a Internet.", 'warning');
      return false;
    }

    try {
      const res = await actions.deleteExpense(id);
      if (res.success) {
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
  }, [actions, showToast, t, isOffline]); 

  const leaveTrip = useCallback(async () => {
    if (isOffline) {
      showToast("Acció no permesa sense connexió a Internet.", 'warning');
      return;
    }

    if (!currentUser || !tripData) return;

    const balances = calculateBalances(expenses, tripData.users);
    const myUser = tripData.users.find(u => u.linkedUid === currentUser.uid);

    if (!canUserLeaveTrip(myUser?.id, balances, BUSINESS_RULES.MAX_LEAVE_BALANCE_MARGIN)) {
      showToast("No pots sortir del viatge fins que no saldis els teus deutes o et paguin el que et deuen.", "error");
      return;
    }

    try {
      const myBalanceAmount = getUserBalance(myUser?.id, balances); 

      const res = await actions.leaveTrip(
        myUser ? myUser.id : currentUser.uid,
        myBalanceAmount,
        !!myUser,
        currentUser.uid
      );

      if (res.success) {
        showToast("Has abandonat el viatge correctament.", "success");
        localStorage.removeItem('cc-last-trip-id');
        navigate('/');
      } else {
        showToast(res.error || "No s'ha pogut sortir del viatge", 'error');
      }
    } catch (e: unknown) {
      showToast(parseAppError(e, t), 'error');
    }
  }, [actions, currentUser, tripData, expenses, navigate, showToast, t, isOffline]); 

  const joinTrip = useCallback(async () => {
     if (isOffline) {
       showToast("Acció no permesa sense connexió a Internet.", 'warning');
       return;
     }

     if(!currentUser) return;
     try {
         await actions.joinTrip(currentUser);
         showToast(LITERALS.ACTIONS.JOIN_TRIP_SUCCESS);
     } catch(e: unknown) { 
         showToast(parseAppError(e, t), 'error');
     }
  }, [actions, currentUser, showToast, t, isOffline]); 

  const deleteTrip = useCallback(async () => {
    if (isOffline) {
      showToast("Acció no permesa sense connexió a Internet.", 'warning');
      return;
    }

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
  }, [actions, navigate, showToast, t, tripData, currentUser, isOffline]); 

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