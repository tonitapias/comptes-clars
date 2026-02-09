import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrip } from '../context/TripContext';
import { ToastType } from '../components/Toast';

// Fixa't que NO hi ha "default". És una exportació nomenada.
export function useTripMutations() {
  const navigate = useNavigate();
  const { actions, tripData, currentUser, balances } = useTrip();
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);

  const showToast = (msg: string, type: ToastType = 'success') => setToast({ msg, type });
  const clearToast = () => setToast(null);

  // --- Wrappers d'Accions ---

  const updateTripSettings = async (name: string, date: string, currency?: any) => {
    try {
      await actions.updateTripSettings(name, date, currency);
      showToast(currency ? "Moneda canviada" : "Configuració actualitzada");
      return true;
    } catch (e: any) {
      showToast(e.message || "Error actualitzant", 'error');
      return false;
    }
  };

  const settleDebt = async (settlement: any, method: string) => {
    try {
      const res = await actions.settleDebt(settlement, method);
      if (res.success) {
        showToast("Pagament registrat!", 'success');
        return true;
      } else {
        showToast("Error liquidant", 'error');
        return false;
      }
    } catch (e) {
      showToast("Error inesperat", 'error');
      return false;
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const res = await actions.deleteExpense(id);
      if (res.success) {
        showToast("Despesa eliminada", 'success');
        return true;
      } else {
        showToast(res.error || "Error eliminant", 'error');
        return false;
      }
    } catch (e) {
      showToast("Error de connexió", 'error');
      return false;
    }
  };

  const leaveTrip = async () => {
    if (!currentUser || !tripData) return;
    
    // Lògica de negoci prèvia (validació local)
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
      window.location.href = '/'; // Redirecció forçada per netejar estat
    } else {
      showToast(res.error || "Error al sortir del grup", 'error');
    }
  };

  const joinTrip = async () => {
     if(!currentUser) return;
     try {
         await actions.joinTrip(currentUser);
         showToast("T'has unit al grup!");
     } catch(e) {
         showToast("Error al unir-se", 'error');
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
      joinTrip
    }
  };
}