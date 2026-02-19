import { Trash2, AlertTriangle } from 'lucide-react';
import Modal from '../Modal';
import Button from '../Button';
import ExpenseModal from '../modals/ExpenseModal';
import GroupModal from '../modals/GroupModal';
import ActivityModal from '../modals/ActivityModal';
import TripSettingsModal from './modals/TripSettingsModal';
import TripSettleModal from './modals/TripSettleModal';

import { useTrip } from '../../context/TripContext'; // [REFAC]: Importem el Context
import { useTripModals } from '../../hooks/useTripModals';
import { useTripMutations } from '../../hooks/useTripMutations';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';
import { ToastType } from '../Toast';
import { LITERALS } from '../../constants/literals';

interface TripModalsProps {
  // [REFAC]: Hem eliminat tripData, users, currency i canChangeCurrency (redundants)
  modals: ReturnType<typeof useTripModals>;
  mutations: ReturnType<typeof useTripMutations>['mutations'];
  showToast: (msg: string, type?: ToastType) => void;
}

export default function TripModals({
  modals, mutations, showToast
}: TripModalsProps) {
  
  const { trigger } = useHapticFeedback();
  
  // [REFAC]: Consumim les dades directament del "Cervell" (Context)
  const { tripData, expenses } = useTrip();

  // Guard de seguretat: Si no hi ha dades, no pintem res
  if (!tripData) return null;

  // [REFAC]: Lògica derivada (Calculada aquí en lloc de passar-la com a prop)
  const users = tripData.users;
  const currency = tripData.currency;
  // Només permetem canviar divisa si no hi ha despeses creades per evitar problemes de canvi
  const canChangeCurrency = expenses.length === 0;

  // --- ACTIONS ---
  
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
    if (success) {
       modals.setSettleModalData(null); 
    }
    return success;
  };

  const isSettleOpen = !!modals.settleModalData;

  return (
    <>
      {/* 1. EDIT/CREATE EXPENSE */}
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
                title: LITERALS.MODALS.CONFIRM.DELETE_EXPENSE_TITLE, 
                message: LITERALS.MODALS.CONFIRM.DELETE_EXPENSE_MSG 
            });
        }} 
        showToast={showToast} 
      />
      
      {/* 2. GROUP MANAGEMENT */}
      <GroupModal 
        isOpen={modals.isGroupModalOpen} 
        onClose={() => modals.setGroupModalOpen(false)} 
        showToast={showToast} 
        initialTab={modals.groupModalTab}
      />
      
      {/* 3. ACTIVITY LOG */}
      <ActivityModal 
        isOpen={modals.isActivityOpen} 
        onClose={() => modals.setActivityOpen(false)} 
      />

      {/* 4. SETTINGS */}
      <TripSettingsModal
        isOpen={modals.isSettingsOpen}
        onClose={() => modals.setSettingsOpen(false)}
        canChangeCurrency={canChangeCurrency}
        onUpdate={mutations.updateTripSettings}
        onLeave={mutations.leaveTrip}
        onDelete={mutations.deleteTrip} 
      />
      
      {/* 5. SETTLE DEBT */}
      <TripSettleModal 
        isOpen={isSettleOpen}
        onClose={() => modals.setSettleModalData(null)}
        settlement={modals.settleModalData} 
        onConfirm={handleSettleConfirm} 
      />

      {/* 6. GENERIC CONFIRMATION */}
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
                {modals.confirmAction?.title || LITERALS.MODALS.CONFIRM.DEFAULT_TITLE}
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
                    {LITERALS.MODALS.CONFIRM.BTN_CANCEL}
                </Button>
                
                <Button 
                    variant="danger" 
                    onClick={handleDeleteExpense} 
                    className="h-12 rounded-xl shadow-lg shadow-rose-500/20 active:shadow-none transition-all font-bold" 
                    icon={Trash2}
                >
                    {LITERALS.MODALS.CONFIRM.BTN_DELETE}
                </Button>
            </div>
          </div>
      </Modal>
    </>
  );
}