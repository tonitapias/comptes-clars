import { useState } from 'react';
import { Expense, Settlement } from '../types';

export type GroupModalTab = 'members' | 'share';
export type ConfirmAction = { type: string; id?: string | number; title: string; message: string };

export function useTripModals() {
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

  // Helpers
  const openExpenseModal = (expense: Expense | null = null) => {
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  };

  const closeExpenseModal = () => {
    setIsExpenseModalOpen(false);
    setEditingExpense(null);
  };

  const openGroupModal = (tab: GroupModalTab = 'members') => {
    setGroupModalTab(tab);
    setGroupModalOpen(true);
  };

  const openConfirmAction = (action: ConfirmAction) => setConfirmAction(action);
  const closeConfirmAction = () => setConfirmAction(null);

  return {
    // Estats
    isSettingsOpen, setSettingsOpen,
    isActivityOpen, setActivityOpen,
    isExpenseModalOpen, editingExpense,
    settleModalData, setSettleModalData,
    isGroupModalOpen, groupModalTab, setGroupModalOpen,
    confirmAction,
    
    // Accions encapsulades
    openExpenseModal, closeExpenseModal,
    openGroupModal,
    openConfirmAction, closeConfirmAction
  };
}