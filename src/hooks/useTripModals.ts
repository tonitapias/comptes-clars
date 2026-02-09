import { useState, useEffect, useRef } from 'react';
import { Expense, Settlement } from '../types';

export type GroupModalTab = 'members' | 'share';
export type ConfirmAction = { type: string; id?: string | number; title: string; message: string };

/**
 * Hook intern per gestionar el botó "Enrere" del navegador en mòbils.
 * Sincronitza l'obertura del modal amb l'historial del navegador.
 */
function useModalBackHandler(isOpen: boolean, onClose: () => void) {
  // Utilitzem refs per evitar cicles infinits si la funció onClose no està memoritzada
  const isBackTriggered = useRef(false);
  const onCloseRef = useRef(onClose);

  // Mantenim la referència de la funció sempre actualitzada
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      // 1. PUSH: Quan s'obre el modal, afegim una entrada "fictícia" a l'historial.
      // Això fa que el botó "Enrere" estigui disponible.
      window.history.pushState({ modalOpen: true }, '', window.location.href);

      const handlePopState = () => {
        // 2. POP (Back Button): Si l'usuari prem enrere, el navegador treu l'entrada.
        // Nosaltres detectem l'event i tanquem el modal visualment.
        isBackTriggered.current = true;
        onCloseRef.current(); 
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        
        // 3. CLEANUP (Manual Close): Si l'usuari tanca el modal amb la "X" (no amb el botó enrere),
        // l'entrada de l'historial encara hi és. Hem de fer 'back()' manualment per netejar-la.
        if (!isBackTriggered.current) {
           window.history.back();
        }
        
        // Reset per a la pròxima vegada
        isBackTriggered.current = false;
      };
    }
  }, [isOpen]);
}

export function useTripModals() {
  // --- Estats dels Modals ---
  
  // Modals simples
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isActivityOpen, setActivityOpen] = useState(false);

  // Modals amb dades complexes
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const [settleModalData, setSettleModalData] = useState<Settlement | null>(null);
  
  const [isGroupModalOpen, setGroupModalOpen] = useState(false);
  const [groupModalTab, setGroupModalTab] = useState<GroupModalTab>('members');

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  // --- Helpers d'Obertura/Tancament ---
  
  const openExpenseModal = (expense: Expense | null = null) => {
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  };

  const closeExpenseModal = () => {
    setIsExpenseModalOpen(false);
    // Netejem la despesa editada (pot ser immediat o diferit, aquí és segur)
    setEditingExpense(null);
  };

  const openGroupModal = (tab: GroupModalTab = 'members') => {
    setGroupModalTab(tab);
    setGroupModalOpen(true);
  };

  const openConfirmAction = (action: ConfirmAction) => setConfirmAction(action);
  const closeConfirmAction = () => setConfirmAction(null);

  // --- INTEGRACIÓ HISTORY API (Botó Enrere) ---
  // Connectem cada estat "obert" amb el seu "tancador".
  
  // 1. Configuració
  useModalBackHandler(isSettingsOpen, () => setSettingsOpen(false));
  
  // 2. Activitat
  useModalBackHandler(isActivityOpen, () => setActivityOpen(false));
  
  // 3. Despesa (Edició/Creació)
  useModalBackHandler(isExpenseModalOpen, closeExpenseModal);
  
  // 4. Liquidar Deute (Settle)
  // usem !!settleModalData per saber si està obert
  useModalBackHandler(!!settleModalData, () => setSettleModalData(null));
  
  // 5. Grup / Compartir
  useModalBackHandler(isGroupModalOpen, () => setGroupModalOpen(false));
  
  // 6. Confirmació / Alerta
  useModalBackHandler(!!confirmAction, closeConfirmAction);

  return {
    // Estats exposats
    isSettingsOpen, setSettingsOpen,
    isActivityOpen, setActivityOpen,
    isExpenseModalOpen, editingExpense,
    settleModalData, setSettleModalData,
    isGroupModalOpen, groupModalTab,
    confirmAction,

    // Helpers exposats
    openExpenseModal, closeExpenseModal,
    openGroupModal, setGroupModalOpen,
    openConfirmAction, closeConfirmAction
  };
}