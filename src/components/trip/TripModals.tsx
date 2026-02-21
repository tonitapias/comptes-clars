// src/components/trip/TripModals.tsx
import React, { Suspense } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import Modal from '../Modal';
import Button from '../Button';

const ExpenseModal = React.lazy(() => import('../modals/ExpenseModal'));
const GroupModal = React.lazy(() => import('../modals/GroupModal'));
const ActivityModal = React.lazy(() => import('../modals/ActivityModal'));
const TripSettingsModal = React.lazy(() => import('./modals/TripSettingsModal'));
const TripSettleModal = React.lazy(() => import('./modals/TripSettleModal'));

import { useTripState } from '../../context/TripContext'; 
import { useTripModals } from '../../hooks/useTripModals';
import { useTripMutations } from '../../hooks/useTripMutations';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';
import { ToastType } from '../Toast';
import { LITERALS } from '../../constants/literals';

// --- SUB-COMPONENT EXTRETA (Clean Code) ---
const ConfirmActionModal = ({ isOpen, onClose, onConfirm, title, message, trigger }: any) => {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="">
          <div className="flex flex-col items-center text-center pt-4 pb-2 animate-fade-in">
            <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-full mb-5 text-rose-500 dark:text-rose-400 shadow-sm border border-rose-100 dark:border-rose-900/50 relative">
                <AlertTriangle size={36} strokeWidth={1.5} />
                <div className="absolute inset-0 rounded-full border-4 border-rose-100 dark:border-rose-900/10 animate-pulse-slow" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                {title || LITERALS.MODALS.CONFIRM.DEFAULT_TITLE}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 px-4 text-sm leading-relaxed">
                {message}
            </p>
            <div className="grid grid-cols-2 gap-3 w-full">
                <Button 
                    variant="secondary" 
                    onClick={() => { trigger('light'); onClose(); }} 
                    className="h-12 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold"
                >
                    {LITERALS.MODALS.CONFIRM.BTN_CANCEL}
                </Button>
                <Button 
                    variant="danger" 
                    onClick={onConfirm} 
                    className="h-12 rounded-xl shadow-lg shadow-rose-500/20 active:shadow-none transition-all font-bold" 
                    icon={Trash2}
                >
                    {LITERALS.MODALS.CONFIRM.BTN_DELETE}
                </Button>
            </div>
          </div>
      </Modal>
    );
};

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

  const handleSettleConfirm = async (method: string) => {
    if (!modals.settleModalData) return false;
    const success = await mutations.settleDebt(modals.settleModalData, method);
    if (success) { modals.setSettleModalData(null); }
    return success;
  };

  return (
    <>
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
      </Suspense>

      <ConfirmActionModal
        isOpen={!!modals.confirmAction}
        onClose={modals.closeConfirmAction}
        onConfirm={handleDeleteExpense}
        title={modals.confirmAction?.title}
        message={modals.confirmAction?.message}
        trigger={trigger}
      />
    </>
  );
}