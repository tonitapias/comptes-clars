import { Trash2, AlertTriangle } from 'lucide-react';
import Modal from '../Modal';
import Button from '../Button';
import ExpenseModal from '../modals/ExpenseModal';
import GroupModal from '../modals/GroupModal';
import ActivityModal from '../modals/ActivityModal';
import TripSettingsModal from './modals/TripSettingsModal';
import TripSettleModal from './modals/TripSettleModal';

import { TripData, TripUser, Currency } from '../../types';
import { useTripModals } from '../../hooks/useTripModals';
import { useTripMutations } from '../../hooks/useTripMutations';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';
import { ToastType } from '../Toast';

interface TripModalsProps {
  tripData: TripData;
  users: TripUser[];
  currency: Currency;
  modals: ReturnType<typeof useTripModals>;
  mutations: ReturnType<typeof useTripMutations>['mutations'];
  showToast: (msg: string, type?: ToastType) => void;
  canChangeCurrency: boolean;
}

export default function TripModals({
  tripData, users, currency, modals, mutations, showToast, canChangeCurrency
}: TripModalsProps) {
  
  const { trigger } = useHapticFeedback();

  const handleDeleteExpense = async () => {
    trigger('medium');
    if (modals.confirmAction?.id) {
      await mutations.deleteExpense(String(modals.confirmAction.id));
    }
    modals.closeConfirmAction();
    modals.closeExpenseModal();
  };

  const handleLeaveTrip = async () => {
    trigger('medium');
    await mutations.leaveTrip();
  };

  return (
    <>
      <ExpenseModal 
        key={modals.editingExpense?.id || 'new'} 
        isOpen={modals.isExpenseModalOpen} 
        onClose={modals.closeExpenseModal} 
        initialData={modals.editingExpense} 
        users={users} 
        currency={currency} 
        tripId={tripData.id} 
        onDelete={(id) => {
            trigger('medium');
            modals.openConfirmAction({ 
                type: 'delete_expense', 
                id, 
                title: 'Esborrar despesa?', 
                message: 'Aquesta acció no es pot desfer. La despesa desapareixerà dels càlculs immediatament.' 
            });
        }} 
        showToast={showToast} 
      />
      
      <GroupModal 
        isOpen={modals.isGroupModalOpen} 
        onClose={() => modals.setGroupModalOpen(false)} 
        showToast={showToast} 
        initialTab={modals.groupModalTab}
      />
      
      <ActivityModal 
        isOpen={modals.isActivityOpen} 
        onClose={() => modals.setActivityOpen(false)} 
      />

      <TripSettingsModal
        isOpen={modals.isSettingsOpen}
        onClose={() => modals.setSettingsOpen(false)}
        tripData={tripData}
        canChangeCurrency={canChangeCurrency}
        onUpdateSettings={mutations.updateTripSettings}
        onLeaveTrip={handleLeaveTrip}
        onDeleteTrip={mutations.deleteTrip} 
      />
      
      <TripSettleModal 
        data={modals.settleModalData}
        onClose={() => modals.setSettleModalData(null)}
        users={users}
        currency={currency}
        onConfirm={mutations.settleDebt}
      />

      <Modal 
        isOpen={!!modals.confirmAction} 
        onClose={modals.closeConfirmAction} 
        title="" 
      >
          <div className="flex flex-col items-center text-center pt-4 pb-2 animate-fade-in">
            <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-full mb-5 text-rose-500 dark:text-rose-400 shadow-sm border border-rose-100 dark:border-rose-900/50 relative">
                <AlertTriangle size={36} strokeWidth={1.5} />
                <div className="absolute inset-0 rounded-full border-4 border-rose-100 dark:border-rose-900/10 animate-pulse-slow" />
            </div>

            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                {modals.confirmAction?.title || 'Estàs segur?'}
            </h3>

            <p className="text-slate-500 dark:text-slate-400 mb-8 px-4 text-sm leading-relaxed">
                {modals.confirmAction?.message}
            </p>
            
            <div className="grid grid-cols-2 gap-3 w-full">
                <Button 
                    variant="secondary" 
                    onClick={() => { trigger('light'); modals.closeConfirmAction(); }} 
                    className="h-12 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold"
                >
                    Cancel·lar
                </Button>
                
                <Button 
                    variant="danger" 
                    onClick={handleDeleteExpense} 
                    className="h-12 rounded-xl shadow-lg shadow-rose-500/20 active:shadow-none transition-all font-bold" 
                    icon={Trash2}
                >
                    Eliminar
                </Button>
            </div>
          </div>
      </Modal>
    </>
  );
}