import React from 'react';
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

interface TripModalsProps {
  tripData: TripData;
  users: TripUser[];
  currency: Currency;
  modals: ReturnType<typeof useTripModals>;
  mutations: ReturnType<typeof useTripMutations>['mutations'];
  showToast: (msg: string, type: 'success' | 'error') => void;
  canChangeCurrency: boolean;
}

export default function TripModals({
  tripData, users, currency, modals, mutations, showToast, canChangeCurrency
}: TripModalsProps) {
  
  const { trigger } = useHapticFeedback();

  const handleDeleteExpense = async () => {
    // Feedback físic en confirmar acció destructiva
    trigger('medium');
    
    if (modals.confirmAction?.id) {
      await mutations.deleteExpense(String(modals.confirmAction.id));
    }
    modals.closeConfirmAction();
    modals.closeExpenseModal();
  };

  const handleLeaveTrip = async () => {
    trigger('medium');
    if (window.confirm("Segur que vols deixar de veure aquest grup?")) {
      await mutations.leaveTrip();
    }
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
                title: 'Atenció', 
                message: 'Segur que vols esborrar aquesta despesa? L\'acció és irreversible.' 
            });
        }} 
        showToast={showToast} 
      />
      
      <GroupModal 
        isOpen={modals.isGroupModalOpen} 
        onClose={() => modals.setGroupModalOpen(false)} 
        trip={tripData} 
        showToast={showToast} 
        onUpdateTrip={() => {}} 
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
      />

      {/* --- CONFIRMATION MODAL (Redissenyat) --- */}
      <Modal 
        isOpen={!!modals.confirmAction} 
        onClose={modals.closeConfirmAction} 
        title={modals.confirmAction?.title || 'Confirmació'}
      >
          <div className="flex flex-col items-center text-center pt-2 pb-2">
            
            {/* Icona d'Alerta Visual */}
            <div className="bg-rose-50 dark:bg-rose-900/20 p-5 rounded-full mb-5 text-rose-500 dark:text-rose-400 shadow-sm border border-rose-100 dark:border-rose-900/50">
                <AlertTriangle size={32} strokeWidth={2} />
            </div>

            <p className="text-slate-600 dark:text-slate-300 mb-8 px-2 text-sm leading-relaxed font-medium">
                {modals.confirmAction?.message}
            </p>
            
            <div className="grid grid-cols-2 gap-3 w-full">
                <Button 
                    variant="secondary" 
                    onClick={() => { trigger('light'); modals.closeConfirmAction(); }} 
                    className="h-12 rounded-xl text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                    Cancel·lar
                </Button>
                <Button 
                    variant="danger" 
                    onClick={handleDeleteExpense} 
                    className="h-12 rounded-xl shadow-lg shadow-rose-500/20 active:shadow-none transition-all" 
                    icon={Trash2}
                >
                    Eliminar
                </Button>
            </div>
          </div>
      </Modal>
      
      <TripSettleModal 
        data={modals.settleModalData}
        onClose={() => modals.setSettleModalData(null)}
        users={users}
        currency={currency}
        onConfirm={mutations.settleDebt}
      />
    </>
  );
}