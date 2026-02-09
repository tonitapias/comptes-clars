import React from 'react';
import { Trash2 } from 'lucide-react';
import Modal from '../Modal';
import Button from '../Button';
import ExpenseModal from '../modals/ExpenseModal';
import GroupModal from '../modals/GroupModal';
import ActivityModal from '../modals/ActivityModal';
import TripSettingsModal from './modals/TripSettingsModal';
import TripSettleModal from './modals/TripSettleModal';

// Tipus
import { TripData, TripUser, Currency } from '../../types';
import { useTripModals } from '../../hooks/useTripModals';
import { useTripMutations } from '../../hooks/useTripMutations';

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

  const handleDeleteExpense = async () => {
    if (modals.confirmAction?.id) {
      await mutations.deleteExpense(String(modals.confirmAction.id));
    }
    modals.closeConfirmAction();
    modals.closeExpenseModal();
  };

  const handleLeaveTrip = async () => {
    if (window.confirm("Segur que vols deixar de veure aquest grup?")) {
      await mutations.leaveTrip();
    }
  };

  return (
    <>
      <ExpenseModal 
        isOpen={modals.isExpenseModalOpen} 
        onClose={modals.closeExpenseModal} 
        initialData={modals.editingExpense} 
        users={users} 
        currency={currency} 
        tripId={tripData.id} 
        onDelete={(id) => modals.openConfirmAction({ 
          type: 'delete_expense', 
          id, 
          title: 'Eliminar Despesa?', 
          message: 'Aquesta acció no es pot desfer.' 
        })} 
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

      <Modal 
        isOpen={!!modals.confirmAction} 
        onClose={modals.closeConfirmAction} 
        title={modals.confirmAction?.title || 'Confirmació'}
      >
          <div className="space-y-6 text-center">
            <p className="text-slate-600 dark:text-slate-300">{modals.confirmAction?.message}</p>
            <div className="flex gap-3">
                <Button variant="secondary" onClick={modals.closeConfirmAction} className="flex-1">Cancel·lar</Button>
                <Button variant="danger" onClick={handleDeleteExpense} className="flex-1" icon={Trash2}>Eliminar</Button>
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