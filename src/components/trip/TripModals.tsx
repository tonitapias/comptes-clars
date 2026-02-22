// src/components/trip/TripModals.tsx
import React, { Suspense } from 'react';
import { useTripState } from '../../context/TripContext'; 
import { useTripModals } from '../../hooks/useTripModals';
import { useTripMutations } from '../../hooks/useTripMutations';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';
import { ToastType } from '../Toast';
import { LITERALS } from '../../constants/literals';
import { Payment } from '../../types';

// Carregues asíncrones optimitzades
const ExpenseModal = React.lazy(() => import('../modals/ExpenseModal'));
const GroupModal = React.lazy(() => import('../modals/GroupModal'));
const ActivityModal = React.lazy(() => import('../modals/ActivityModal'));
const TripSettingsModal = React.lazy(() => import('./modals/TripSettingsModal'));
const TripSettleModal = React.lazy(() => import('./modals/TripSettleModal'));
const ConfirmActionModal = React.lazy(() => import('../modals/ConfirmActionModal'));

interface TripModalsProps {
  modals: ReturnType<typeof useTripModals>;
  mutations: ReturnType<typeof useTripMutations>['mutations'];
  showToast: (msg: string, type?: ToastType) => void;
}

export default function TripModals({ modals, mutations, showToast }: TripModalsProps) {
  const { trigger } = useHapticFeedback();
  const { tripData, expenses } = useTripState();

  if (!tripData) return null;

  const canChangeCurrency = expenses.length === 0;
  
  const handleDeleteExpense = async () => {
    trigger('medium');
    if (modals.confirmAction?.id) {
      await mutations.deleteExpense(String(modals.confirmAction.id));
    }
    modals.closeConfirmAction();
    modals.closeExpenseModal();
  };

  const handleSettleConfirm = async (method: Payment['method']) => {
    if (!modals.settleModalData) return false;
    const success = await mutations.settleDebt(modals.settleModalData, method);
    if (success) { modals.setSettleModalData(null); }
    return success;
  };

  return (
    <Suspense fallback={null}>
      <ExpenseModal 
        key={modals.editingExpense?.id || 'new'} 
        isOpen={modals.isExpenseModalOpen} 
        onClose={modals.closeExpenseModal} 
        initialData={modals.editingExpense} 
        users={tripData.users} 
        currency={tripData.currency} 
        tripId={tripData.id} 
        onDelete={(id) => {
            trigger('medium');
            modals.openConfirmAction({ 
                type: 'delete_expense', id, 
                title: LITERALS.MODALS.CONFIRM.DELETE_EXPENSE_TITLE, 
                message: LITERALS.MODALS.CONFIRM.DELETE_EXPENSE_MSG 
            });
        }} 
        showToast={showToast} 
      />
      <GroupModal isOpen={modals.isGroupModalOpen} onClose={() => modals.setGroupModalOpen(false)} showToast={showToast} initialTab={modals.groupModalTab} />
      <ActivityModal isOpen={modals.isActivityOpen} onClose={() => modals.setActivityOpen(false)} />
      <TripSettingsModal isOpen={modals.isSettingsOpen} onClose={() => modals.setSettingsOpen(false)} canChangeCurrency={canChangeCurrency} onUpdate={mutations.updateTripSettings} onLeave={mutations.leaveTrip} onDelete={mutations.deleteTrip} />
      <TripSettleModal isOpen={!!modals.settleModalData} onClose={() => modals.setSettleModalData(null)} settlement={modals.settleModalData} onConfirm={handleSettleConfirm} />
      
      <ConfirmActionModal
        isOpen={!!modals.confirmAction}
        onClose={modals.closeConfirmAction}
        onConfirm={handleDeleteExpense}
        title={modals.confirmAction?.title}
        message={modals.confirmAction?.message}
        trigger={trigger}
      />
    </Suspense>
  );
}