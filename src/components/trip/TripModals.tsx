// src/components/trip/TripModals.tsx
import React, { Suspense, useCallback } from 'react';
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

// [MILLORA RISC ZERO]: Emboliquem amb React.memo per evitar re-renders si el pare s'actualitza
const TripModals = React.memo(function TripModals({ modals, mutations, showToast }: TripModalsProps) {
  const { trigger } = useHapticFeedback();
  const { tripData, expenses } = useTripState();

  // [MILLORA RISC ZERO]: Desestruturem funcions i estats específics abans dels useCallback.
  // Així evitem que un canvi aliè a 'modals' o 'mutations' trenqui la memoització.
  const { 
    confirmAction, closeConfirmAction, closeExpenseModal, 
    settleModalData, setSettleModalData,
    editingExpense, isExpenseModalOpen, isGroupModalOpen, setGroupModalOpen, groupModalTab,
    isActivityOpen, setActivityOpen, isSettingsOpen, setSettingsOpen, openConfirmAction
  } = modals;

  const { deleteExpense, settleDebt, updateTripSettings, leaveTrip, deleteTrip } = mutations;

  const canChangeCurrency = expenses?.length === 0;
  
  // Ara les dependències són valors primitius o referències a funcions estables
  const handleDeleteExpense = useCallback(async () => {
    trigger('medium');
    if (confirmAction?.id) {
      await deleteExpense(String(confirmAction.id));
    }
    closeConfirmAction();
    closeExpenseModal();
  }, [trigger, confirmAction?.id, deleteExpense, closeConfirmAction, closeExpenseModal]);

  const handleSettleConfirm = useCallback(async (method: Payment['method']) => {
    if (!settleModalData) return false;
    const success = await settleDebt(settleModalData, method);
    if (success) { setSettleModalData(null); }
    return success;
  }, [settleModalData, settleDebt, setSettleModalData]);

  if (!tripData) return null;

  return (
    <Suspense fallback={null}>
      <ExpenseModal 
        key={editingExpense?.id || 'new'} 
        isOpen={isExpenseModalOpen} 
        onClose={closeExpenseModal} 
        initialData={editingExpense} 
        users={tripData.users} 
        currency={tripData.currency} 
        tripId={tripData.id} 
        onDelete={(id) => {
            trigger('medium');
            openConfirmAction({ 
                type: 'delete_expense', id, 
                title: LITERALS.MODALS.CONFIRM.DELETE_EXPENSE_TITLE, 
                message: LITERALS.MODALS.CONFIRM.DELETE_EXPENSE_MSG 
            });
        }} 
        showToast={showToast} 
      />
      <GroupModal isOpen={isGroupModalOpen} onClose={() => setGroupModalOpen(false)} showToast={showToast} initialTab={groupModalTab} />
      <ActivityModal isOpen={isActivityOpen} onClose={() => setActivityOpen(false)} />
      <TripSettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} canChangeCurrency={canChangeCurrency} onUpdate={updateTripSettings} onLeave={leaveTrip} onDelete={deleteTrip} />
      <TripSettleModal isOpen={!!settleModalData} onClose={() => setSettleModalData(null)} settlement={settleModalData} onConfirm={handleSettleConfirm} />
      
      <ConfirmActionModal
        isOpen={!!confirmAction}
        onClose={closeConfirmAction}
        onConfirm={handleDeleteExpense}
        title={confirmAction?.title}
        message={confirmAction?.message}
        trigger={trigger}
      />
    </Suspense>
  );
});

export default TripModals;