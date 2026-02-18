import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrip } from '../context/TripContext';
import { ToastType } from '../components/Toast';
import { calculateBalances } from '../services/billingService';
import { Currency, CategoryId, SplitType } from '../types';
import { LITERALS } from '../constants/literals'; // IMPORT NOU

const SETTLEMENT_CATEGORY: CategoryId = 'transfer';
const SETTLEMENT_SPLIT_TYPE: SplitType = 'equal';

export function useTripMutations() {
  const navigate = useNavigate();
  const { actions, tripData, currentUser, expenses } = useTrip();
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);

  const showToast = (msg: string, type: ToastType = 'success') => setToast({ msg, type });
  const clearToast = () => setToast(null);

  // --- Wrappers d'Accions ---

  const updateTripSettings = async (name: string, currency: Currency) => {
    try {
      await actions.updateTripSettings(name, new Date().toISOString(), currency);
      showToast(currency ? LITERALS.ACTIONS.UPDATE_SETTINGS_SUCCESS : LITERALS.ACTIONS.UPDATE_NAME_SUCCESS);
      return true;
    } catch (e: any) {
      showToast(e.message || LITERALS.ACTIONS.UPDATE_ERROR, 'error');
      return false;
    }
  };

  const settleDebt = async (settlement: any, method: string = 'manual') => {
    try {
      // 1. Diccionari de títols (Centralitzat)
      const titles: Record<string, string> = {
        bizum: LITERALS.MODALS.PAYMENT_TITLES.BIZUM,
        manual: LITERALS.MODALS.PAYMENT_TITLES.MANUAL,
        transfer: LITERALS.MODALS.PAYMENT_TITLES.TRANSFER,
        card: LITERALS.MODALS.PAYMENT_TITLES.CARD
      };

      const customTitle = titles[method] || LITERALS.MODALS.PAYMENT_TITLES.DEFAULT;

      // 2. Construïm la despesa de manera Type-Safe
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
        // Netegem el prefix "Pagament via" per al missatge curt del toast
        const methodText = titles[method]?.replace('Pagament via ', '') || 'Efectiu';
        showToast(`${LITERALS.ACTIONS.SETTLE_SUCCESS}${methodText}`, 'success');
        return true;
      } else {
        showToast(LITERALS.ACTIONS.SETTLE_ERROR, 'error');
        return false;
      }
    } catch (e) {
      console.error(e);
      showToast(LITERALS.ACTIONS.UNEXPECTED_ERROR, 'error');
      return false;
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const res = await actions.deleteExpense(id);
      if (res.success) {
        showToast(LITERALS.ACTIONS.DELETE_EXPENSE_SUCCESS, 'success');
        return true;
      } else {
        showToast(res.error || LITERALS.ACTIONS.DELETE_EXPENSE_ERROR, 'error');
        return false;
      }
    } catch (e) {
      showToast(LITERALS.ACTIONS.CONNECTION_ERROR, 'error');
      return false;
    }
  };

  const leaveTrip = async () => {
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
  };

  const joinTrip = async () => {
     if(!currentUser) return;
     try {
         await actions.joinTrip(currentUser);
         showToast(LITERALS.ACTIONS.JOIN_TRIP_SUCCESS);
     } catch(e) {
         showToast(LITERALS.ACTIONS.JOIN_TRIP_ERROR, 'error');
     }
  };

  const deleteTrip = async () => {
    try {
      await actions.deleteTrip();
      showToast(LITERALS.ACTIONS.DELETE_TRIP_SUCCESS);
      localStorage.removeItem('cc-last-trip-id');
      navigate('/');
    } catch (e: any) {
      console.error(e);
      showToast(e.message || LITERALS.ACTIONS.DELETE_TRIP_ERROR, 'error');
    }
  };

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