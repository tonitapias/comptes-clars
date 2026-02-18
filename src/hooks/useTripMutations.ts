import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrip } from '../context/TripContext';
import { ToastType } from '../components/Toast';
import { calculateBalances } from '../services/billingService'; 
// CORRECCIÓ 1: Importem els tipus necessaris per evitar l'error
import { Currency, CategoryId, SplitType } from '../types';

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
      showToast(currency ? "Configuració actualitzada" : "Nom canviat");
      return true;
    } catch (e: any) {
      showToast(e.message || "Error actualitzant", 'error');
      return false;
    }
  };

  const settleDebt = async (settlement: any, method: string = 'manual') => {
    try {
      // 1. Diccionari de títols segons el mètode seleccionat
      const titles: Record<string, string> = {
        bizum: 'Pagament via Bizum',
        manual: 'Pagament en Efectiu',
        transfer: 'Transferència Bancària',
        card: 'Pagament (Altres)'
      };

      // 2. Seleccionem el títol
      const customTitle = titles[method] || 'Liquidació de deute';

      // 3. Construïm la despesa manualment
      const expenseData = {
        title: customTitle,
        amount: settlement.amount,
        payer: settlement.from,
        involved: [settlement.to],
        
        // CORRECCIÓ 2: Forcem el tipus perquè TypeScript no es queixi
        category: 'transfer' as CategoryId, 
        
        date: new Date().toISOString(),
        
        // CORRECCIÓ 3: També assegurem el tipus de split
        splitType: 'equal' as SplitType 
      };

      // 4. Usem addExpense
      const res = await actions.addExpense(expenseData);

      if (res.success) {
        const methodText = titles[method]?.replace('Pagament via ', '') || 'Efectiu';
        showToast(`Registrat: ${methodText}`, 'success');
        return true;
      } else {
        showToast("Error liquidant", 'error');
        return false;
      }
    } catch (e) {
      console.error(e);
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
      navigate('/'); 
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