import { useTranslation } from 'react-i18next';
import { parseAppError } from '../utils/errorHandler';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripState, useTripDispatch } from '../context/TripContext';
import { ToastType } from '../components/Toast';
import { calculateBalances } from '../services/billingService';
import { Currency, CategoryId, SplitType, Settlement } from '../types'; 
import { LITERALS } from '../constants/literals';

const SETTLEMENT_CATEGORY: CategoryId = 'transfer';
const SETTLEMENT_SPLIT_TYPE: SplitType = 'equal';

export function useTripMutations() {
  const navigate = useNavigate();
  // [NOU]: Instanciem les traduccions
  const { t } = useTranslation(); 
  
  const { tripData, currentUser, expenses } = useTripState();
  const actions = useTripDispatch();
  
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);

  const showToast = useCallback((msg: string, type: ToastType = 'success') => setToast({ msg, type }), []);
  const clearToast = useCallback(() => setToast(null), []);

  // [NOU]: Funció validadora de connectivitat abans d'atacar el servidor
  const checkNetworkStatus = useCallback((): boolean => {
    if (!navigator.onLine) {
      showToast(LITERALS.ACTIONS.CONNECTION_ERROR || 'Sense connexió a Internet', 'error');
      return false;
    }
    return true;
  }, [showToast]);

  const updateTripSettings = useCallback(async (name: string, currency: Currency) => {
    if (!checkNetworkStatus()) return false; // [NOU]: Early Return

    try {
      await actions.updateTripSettings(name, new Date().toISOString(), currency);
      showToast(currency ? LITERALS.ACTIONS.UPDATE_SETTINGS_SUCCESS : LITERALS.ACTIONS.UPDATE_NAME_SUCCESS);
      return true;
    } catch (e: unknown) { 
      // [RISC ZERO]: Fem servir la nova utilitat d'errors passant 't'
      showToast(parseAppError(e, t), 'error'); 
      return false;
    }
  }, [actions, showToast, checkNetworkStatus, t]); // <-- Afegim 't' a les dependències

  const settleDebt = useCallback(async (settlement: Settlement, method: string = 'manual') => {
    if (!checkNetworkStatus()) return false; // [NOU]: Early Return

    try {
      const titles: Record<string, string> = {
        bizum: LITERALS.MODALS.PAYMENT_TITLES.BIZUM,
        manual: LITERALS.MODALS.PAYMENT_TITLES.MANUAL,
        transfer: LITERALS.MODALS.PAYMENT_TITLES.TRANSFER,
        card: LITERALS.MODALS.PAYMENT_TITLES.CARD
      };

      const customTitle = titles[method] || LITERALS.MODALS.PAYMENT_TITLES.DEFAULT;

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
        const methodText = titles[method]?.replace('Pagament via ', '') || 'Efectiu';
        showToast(`${LITERALS.ACTIONS.SETTLE_SUCCESS}${methodText}`, 'success');
        return true;
      } else {
        showToast(LITERALS.ACTIONS.SETTLE_ERROR, 'error');
        return false;
      }
    } catch (e: unknown) { 
      console.error(e);
      showToast(LITERALS.ACTIONS.UNEXPECTED_ERROR, 'error');
      return false;
    }
  }, [actions, showToast, checkNetworkStatus]);

  const deleteExpense = useCallback(async (id: string) => {
    if (!checkNetworkStatus()) return false; // [NOU]: Early Return

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
      showToast(LITERALS.ACTIONS.CONNECTION_ERROR, 'error');
      return false;
    }
  }, [actions, showToast, checkNetworkStatus]);

  const leaveTrip = useCallback(async () => {
    if (!checkNetworkStatus()) return; // [NOU]: Early Return
    if (!currentUser || !tripData) return;

    const balances = calculateBalances(expenses, tripData.users);
    const myUser = tripData.users.find(u => u.linkedUid === currentUser.uid);
    const myBalance = balances.find(b => b.userId === myUser?.id)?.amount || 0;

    const res = await actions.leaveTrip(
      myUser ? myUser.id : currentUser.uid,
      myBalance,
      !!myUser,
      currentUser.uid
    );

    if (res.success) {
      localStorage.removeItem('cc-last-trip-id');
      navigate('/');
    } else {
      showToast(res.error || LITERALS.ACTIONS.LEAVE_TRIP_ERROR, 'error');
    }
  }, [actions, currentUser, tripData, expenses, navigate, showToast, checkNetworkStatus]);

  const joinTrip = useCallback(async () => {
     if (!checkNetworkStatus()) return; // [NOU]: Early Return
     if(!currentUser) return;
     try {
         await actions.joinTrip(currentUser);
         showToast(LITERALS.ACTIONS.JOIN_TRIP_SUCCESS);
     } catch(e: unknown) { 
         showToast(LITERALS.ACTIONS.JOIN_TRIP_ERROR, 'error');
     }
  }, [actions, currentUser, showToast, checkNetworkStatus]);

  const deleteTrip = useCallback(async () => {
    if (!checkNetworkStatus()) return; // [NOU]: Early Return

    try {
      await actions.deleteTrip();
      showToast(LITERALS.ACTIONS.DELETE_TRIP_SUCCESS);
      localStorage.removeItem('cc-last-trip-id');
      navigate('/');
    } catch (e: unknown) { 
      console.error(e);
      showToast(parseAppError(e, t), 'error'); 
    }
  }, [actions, navigate, showToast, checkNetworkStatus, t]);

  return {
    toast,
    showToast,
    clearToast,
    mutations: {
      updateTripSettings,
      settleDebt,
      deleteExpense,
      leaveTrip,
      joinTrip,
      deleteTrip
    }
  };
}