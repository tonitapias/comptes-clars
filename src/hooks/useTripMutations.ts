import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrip } from '../context/TripContext';
import { ToastType } from '../components/Toast';
import { calculateBalances } from '../services/billingService'; // <--- Import necessari

export function useTripMutations() {
  const navigate = useNavigate();
  // CORRECCIÓ: Traiem 'balances' del context (no existeix) i agafem 'expenses'
  const { actions, tripData, currentUser, expenses } = useTrip(); 
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
    
    // CORRECCIÓ: Calculem els balanços al moment per verificar deutes
    const balances = calculateBalances(expenses, tripData.users);

    const myUser = tripData.users.find(u => u.linkedUid === currentUser.uid);
    // Ara TypeScript ja sap que 'b' és de tipus Balance
    const myBalance = balances.find(b => b.userId === myUser?.id)?.amount || 0;

    const res = await actions.leaveTrip(
      myUser ? myUser.id : currentUser.uid, 
      myBalance,
      !!myUser, 
      currentUser.uid
    );

    if (res.success) {
      localStorage.removeItem('cc-last-trip-id');
      navigate('/'); // CORRECCIÓ: Usem navigate en lloc de window.location
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

  const deleteTrip = async () => {
    try {
      await actions.deleteTrip(); 
      showToast("Viatge eliminat correctament");
      localStorage.removeItem('cc-last-trip-id');
      navigate('/'); // CORRECCIÓ: Usem navigate aquí també
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Error eliminant el viatge", 'error');
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