// src/components/trip/TripModals.tsx
import React, { Suspense, useCallback, useMemo, useState, useEffect } from 'react';
import { useTripMeta, useTripExpenses } from '../../context/TripContext'; 
import { useTripModals } from '../../hooks/useTripModals';
import { useTripMutations } from '../../hooks/useTripMutations';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';
import { ToastType } from '../Toast';
import { LITERALS } from '../../constants/literals';
import { PaymentMethodId } from '../../types';

// Carregues asíncrones optimitzades
const ExpenseModal = React.lazy(() => import('../modals/ExpenseModal'));
const GroupModal = React.lazy(() => import('../modals/GroupModal'));
const ActivityModal = React.lazy(() => import('../modals/ActivityModal'));
const TripSettingsModal = React.lazy(() => import('./modals/TripSettingsModal'));
const TripSettleModal = React.lazy(() => import('./modals/TripSettleModal'));
const ConfirmActionModal = React.lazy(() => import('../modals/ConfirmActionModal'));

const LazyModal = ({ isOpen, children }: { isOpen: boolean, children: React.ReactNode }) => {
  const [hasMounted, setHasMounted] = useState(isOpen);
  
  useEffect(() => {
    if (isOpen && !hasMounted) {
      setHasMounted(true);
    }
  }, [isOpen, hasMounted]);

  if (!hasMounted) return null;

  return <Suspense fallback={null}>{children}</Suspense>;
};

interface TripModalsProps {
  modals: ReturnType<typeof useTripModals>;
  mutations: ReturnType<typeof useTripMutations>['mutations'];
  showToast: (msg: string, type?: ToastType) => void;
}

const TripModals = React.memo(function TripModals({ modals, mutations, showToast }: TripModalsProps) {
  const { trigger } = useHapticFeedback();
  const { tripData } = useTripMeta();
  const { expenses } = useTripExpenses();

  const { 
    confirmAction, closeConfirmAction, closeExpenseModal, 
    settleModalData, setSettleModalData,
    editingExpense, isExpenseModalOpen, isGroupModalOpen, setGroupModalOpen, groupModalTab,
    isActivityOpen, setActivityOpen, isSettingsOpen, setSettingsOpen, openConfirmAction
  } = modals;

  // [FASE 2 FIX]: Afegim deletePayment a la desestructuració
  const { deleteExpense, deletePayment, settleDebt, updateTripSettings, leaveTrip, deleteTrip } = mutations;

  const canChangeCurrency = useMemo(() => expenses?.length === 0, [expenses?.length]);
  
  // [FASE 2 FIX]: La UI ara decideix quina mutació cridar basant-se en l'ID
  const handleDeleteExpense = useCallback(async () => {
    trigger('medium');
    if (confirmAction?.id && tripData) {
      const targetId = String(confirmAction.id);
      
      // Comprovem si l'ID pertany a un pagament/liquidació
      const isPayment = tripData.payments?.some(p => p.id === targetId);

      if (isPayment) {
        await deletePayment(targetId);
      } else {
        await deleteExpense(targetId);
      }
    }
    closeConfirmAction();
    closeExpenseModal();
  }, [trigger, confirmAction?.id, tripData, deletePayment, deleteExpense, closeConfirmAction, closeExpenseModal]);

  const handleSettleConfirm = useCallback(async (method: PaymentMethodId) => {
    if (!settleModalData) return false;
    const success = await settleDebt(settleModalData, method);
    if (success) { 
        setSettleModalData(null); 
    }
    return success;
  }, [settleModalData, settleDebt, setSettleModalData]);

  if (!tripData) return null;

  return (
    <>
      <LazyModal isOpen={isExpenseModalOpen}>
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
              // Com que la UI reutilitza el modal, el missatge pot ser genèric o podem comprovar si és pagament per canviar el text
              const isPayment = tripData.payments?.some(p => p.id === String(id));
              openConfirmAction({ 
                  type: 'delete_expense', id, 
                  title: isPayment ? "Anul·lar liquidació" : LITERALS.MODALS.CONFIRM.DELETE_EXPENSE_TITLE, 
                  message: isPayment ? "Segur que vols anul·lar aquest pagament? Els deutes tornaran a l'estat anterior." : LITERALS.MODALS.CONFIRM.DELETE_EXPENSE_MSG 
              });
          }} 
          showToast={showToast} 
        />
      </LazyModal>

      <LazyModal isOpen={isGroupModalOpen}>
        <GroupModal isOpen={isGroupModalOpen} onClose={() => setGroupModalOpen(false)} showToast={showToast} initialTab={groupModalTab} />
      </LazyModal>

      <LazyModal isOpen={isActivityOpen}>
        <ActivityModal isOpen={isActivityOpen} onClose={() => setActivityOpen(false)} />
      </LazyModal>

      <LazyModal isOpen={isSettingsOpen}>
        <TripSettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} canChangeCurrency={canChangeCurrency} onUpdate={updateTripSettings} onLeave={leaveTrip} onDelete={deleteTrip} />
      </LazyModal>

      <LazyModal isOpen={!!settleModalData}>
        <TripSettleModal isOpen={!!settleModalData} onClose={() => setSettleModalData(null)} settlement={settleModalData} onConfirm={handleSettleConfirm} />
      </LazyModal>
      
      <LazyModal isOpen={!!confirmAction}>
        <ConfirmActionModal
          isOpen={!!confirmAction}
          onClose={closeConfirmAction}
          onConfirm={handleDeleteExpense}
          title={confirmAction?.title}
          message={confirmAction?.message}
          trigger={trigger}
        />
      </LazyModal>
    </>
  );
});

export default TripModals;