import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, CheckCircle2, Loader2, AlertTriangle, UserPlus, Wallet, Receipt, Trash2, ArrowRightLeft, Lock, LogOut } from 'lucide-react'; 
import { User } from 'firebase/auth';

// Components
import Button from '../components/Button';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import ExpenseModal from '../components/modals/ExpenseModal';
import GroupModal from '../components/modals/GroupModal';
import ActivityModal from '../components/modals/ActivityModal';
import TripHeader from '../components/trip/TripHeader';
import ExpensesList from '../components/trip/ExpensesList';
import BalancesView from '../components/trip/BalancesView';
import SettlementsView from '../components/trip/SettlementsView';

// Context & Hooks
import { TripProvider, useTrip } from '../context/TripContext';
import { useTripCalculations } from '../hooks/useTripCalculations';
import { useTripModals } from '../hooks/useTripModals';
import { useTripFilters } from '../hooks/useTripFilters';
import { useTripMutations } from '../hooks/useTripMutations';
import { generatePDF } from '../utils/exportPdf';
import { formatCurrency } from '../utils/formatters';
import { CURRENCIES } from '../utils/constants';

interface TripPageProps { user: User | null; }

// --- WRAPPER ---
export default function TripPageWrapper({ user }: TripPageProps) {
  const { tripId } = useParams<{ tripId: string }>();
  return (
    <TripProvider tripId={tripId} currentUser={user}>
      <TripView />
    </TripProvider>
  );
}

// --- VISTA PRINCIPAL ---
function TripView() {
  // CORRECCIÓ: No agafem 'users' aquí perquè no existeix al context arrel.
  const { tripData, expenses, loading, error, currentUser, isMember } = useTrip();

  // 1. Hooks de Lògica
  const modals = useTripModals();
  const filters = useTripFilters();
  const { toast, clearToast, showToast, mutations } = useTripMutations();

  // 2. Estat local mínim
  const [editTripName, setEditTripName] = useState('');
  const [editTripDate, setEditTripDate] = useState('');
  const [settleMethod, setSettleMethod] = useState('Bizum');

  // 3. Càlculs
  const { filteredExpenses, balances, categoryStats, settlements, totalGroupSpending, displayedTotal } = useTripCalculations(
    expenses, 
    tripData?.users || [], 
    filters.searchQuery, 
    filters.filterCategory
  );

  // 4. Efectes
  useEffect(() => {
    if (tripData) {
        setEditTripName(tripData.name);
        setEditTripDate(tripData.createdAt ? tripData.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);
        localStorage.setItem('cc-last-trip-id', tripData.id);
    }
  }, [tripData]);

  // 5. Handlers
  const onSaveSettings = async () => {
      const success = await mutations.updateTripSettings(editTripName, editTripDate);
      if(success) modals.setSettingsOpen(false);
  };

  const onConfirmSettle = async () => {
      if(!modals.settleModalData) return;
      const success = await mutations.settleDebt(modals.settleModalData, settleMethod);
      if(success) modals.setSettleModalData(null);
  };

  const onConfirmDelete = async () => {
      if (modals.confirmAction?.id) {
          await mutations.deleteExpense(String(modals.confirmAction.id));
      }
      modals.closeConfirmAction();
      modals.closeExpenseModal();
  };
  
  const onLeaveTrip = async () => {
      if(confirm("Segur que vols deixar de veure aquest grup?")) {
          await mutations.leaveTrip();
      }
  };

  // --- RENDER ---
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400"/></div>;
  if (error || !tripData) return <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950"><AlertTriangle className="text-red-500" size={40}/><p className="text-slate-600 dark:text-slate-300 font-bold">{error || "No s'ha trobat el viatge"}</p><Button variant="secondary" onClick={() => window.location.href='/'}>Tornar a l'inici</Button></div>;

  // CORRECCIÓ: Extraiem 'users' aquí, un cop sabem que tripData existeix.
  const { currency = CURRENCIES[0], users = [] } = tripData;
  const canChangeCurrency = expenses.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 pb-24 md:pb-10 transition-colors duration-300">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={clearToast} />}
      
      <TripHeader 
        displayedTotal={displayedTotal} 
        totalGroupSpending={totalGroupSpending}
        isFiltered={!!filters.searchQuery || filters.filterCategory !== 'all'}
        onOpenSettings={() => modals.setSettingsOpen(true)}
        onOpenGroup={() => modals.openGroupModal('members')}
        onExportPDF={() => generatePDF(tripData.name, expenses, balances, settlements, users, currency.symbol)}
        onOpenShare={() => modals.openGroupModal('share')}
        onOpenActivity={() => modals.setActivityOpen(true)}
      />

      {!isMember && currentUser && (
          <div className="bg-indigo-600 dark:bg-indigo-700 text-white px-4 py-3 text-center shadow-md relative z-30 animate-fade-in">
              <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
                  <p className="text-sm font-medium">Estàs veient aquest viatge com a convidat.</p>
                  <button onClick={mutations.joinTrip} className="bg-white text-indigo-600 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm hover:bg-indigo-50 flex items-center gap-1">
                    <UserPlus size={14}/> Unir-me al grup
                  </button>
              </div>
          </div>
      )}

      <main className="max-w-3xl mx-auto px-4 relative z-20 mt-6">
        <div className="flex p-1.5 bg-white dark:bg-slate-900 rounded-2xl mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
          {(['expenses', 'balances', 'settle'] as const).map(tab => (
            <button key={tab} onClick={() => filters.setActiveTab(tab)} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${filters.activeTab === tab ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                {tab === 'expenses' && <Receipt size={16} />}{tab === 'balances' && <Wallet size={16} />}{tab === 'settle' && <CheckCircle2 size={16} />}
                <span className="hidden sm:inline">{tab === 'expenses' ? 'Despeses' : tab === 'balances' ? 'Balanç' : 'Liquidar'}</span>
            </button>
          ))}
        </div>

        {filters.activeTab === 'expenses' && (
            expenses.length === 0 && !filters.searchQuery && filters.filterCategory === 'all' ? (
             <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
                <Receipt size={48} className="text-indigo-400 dark:text-indigo-500 mb-4" />
                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">No hi ha despeses</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-xs mb-6">Afegeix la primera despesa per començar a dividir comptes.</p>
                <Button onClick={() => modals.openExpenseModal(null)} icon={Plus}>Afegir Despesa</Button>
             </div>
            ) : (
             <ExpensesList 
                expenses={filteredExpenses} 
                searchQuery={filters.searchQuery} setSearchQuery={filters.setSearchQuery} 
                filterCategory={filters.filterCategory} setFilterCategory={filters.setFilterCategory} 
                onEdit={modals.openExpenseModal} 
             />
            )
        )}
        {filters.activeTab === 'balances' && <BalancesView balances={balances} categoryStats={categoryStats} />}
        {filters.activeTab === 'settle' && <SettlementsView settlements={settlements} onSettle={modals.setSettleModalData} />}
      </main>
      
      <button onClick={() => modals.openExpenseModal(null)} className="fixed bottom-6 right-6 md:right-[calc(50%-350px)] bg-indigo-600 text-white p-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all z-40 shadow-indigo-200 dark:shadow-none active:scale-95"><Plus size={28} /></button>
      
      <ExpenseModal 
        isOpen={modals.isExpenseModalOpen} onClose={modals.closeExpenseModal} 
        initialData={modals.editingExpense} users={users} currency={currency} tripId={tripData.id} 
        onDelete={(id) => modals.openConfirmAction({ type: 'delete_expense', id, title: 'Eliminar Despesa?', message: 'Aquesta acció no es pot desfer.' })} 
        showToast={showToast} 
      />
      
      <GroupModal 
        isOpen={modals.isGroupModalOpen} onClose={() => modals.setGroupModalOpen(false)} 
        trip={tripData} showToast={showToast} onUpdateTrip={() => {}} initialTab={modals.groupModalTab}
      />
      
      <ActivityModal isOpen={modals.isActivityOpen} onClose={() => modals.setActivityOpen(false)} />

      <Modal isOpen={modals.isSettingsOpen} onClose={() => modals.setSettingsOpen(false)} title="Configuració del Grup">
        <div className="space-y-6">
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nom</label><input type="text" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl" value={editTripName} onChange={e => setEditTripName(e.target.value)} /></div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Data</label><input type="date" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl" value={editTripDate} onChange={e => setEditTripDate(e.target.value)} /></div>
          <div>
            <div className="flex justify-between mb-2"><label className="block text-xs font-bold text-slate-500 uppercase">Moneda</label>{!canChangeCurrency && <span className="text-xs text-rose-500 font-bold flex gap-1"><Lock size={12}/> Bloquejat</span>}</div>
            <div className="grid grid-cols-2 gap-2">{CURRENCIES.map(c => (<button key={c.code} onClick={() => canChangeCurrency && mutations.updateTripSettings(editTripName, editTripDate, c)} disabled={!canChangeCurrency} className={`p-3 rounded-xl border-2 text-sm font-bold flex justify-center gap-2 ${currency.code === c.code ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100'} ${!canChangeCurrency && currency.code !== c.code ? 'opacity-40' : ''}`}><span>{c.symbol}</span> {c.code}</button>))}</div>
          </div>
          <Button onClick={onSaveSettings}>Guardar canvis</Button>
          <div className="border-t pt-4"><button onClick={onLeaveTrip} className="w-full p-3 flex justify-center gap-2 text-rose-600 bg-rose-50 hover:bg-rose-100 font-bold rounded-xl"><LogOut size={18}/> Abandonar Grup</button></div>
        </div>
      </Modal>

      <Modal isOpen={!!modals.confirmAction} onClose={modals.closeConfirmAction} title={modals.confirmAction?.title || 'Confirmació'}>
          <div className="space-y-6 text-center">
            <p className="text-slate-600 dark:text-slate-300">{modals.confirmAction?.message}</p>
            <div className="flex gap-3">
                <Button variant="secondary" onClick={modals.closeConfirmAction} className="flex-1">Cancel·lar</Button>
                <Button variant="danger" onClick={onConfirmDelete} className="flex-1" icon={Trash2}>Eliminar</Button>
            </div>
          </div>
      </Modal>
      
      <Modal isOpen={!!modals.settleModalData} onClose={() => modals.setSettleModalData(null)} title="Confirmar Pagament">
        {modals.settleModalData && (
          <div className="space-y-6 text-center">
            <div className="py-4"><p className="text-xl font-bold text-slate-800 dark:text-white my-2">{users.find(u => u.id === modals.settleModalData?.from)?.name} <ArrowRightLeft className="inline mx-2"/> {users.find(u => u.id === modals.settleModalData?.to)?.name}</p><p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(modals.settleModalData.amount, currency)}</p></div>
            <div className="flex justify-center gap-2 flex-wrap">{['Bizum', 'Efectiu', 'Transferència', 'PayPal'].map(m => <button key={m} onClick={() => setSettleMethod(m)} className={`px-3 py-1.5 rounded-lg border-2 font-bold transition-all ${settleMethod === m ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100'}`}>{m}</button>)}</div>
            <div className="flex gap-2"><Button variant="secondary" onClick={() => modals.setSettleModalData(null)} className="flex-1">Cancel·lar</Button><Button variant="success" onClick={onConfirmSettle} className="flex-1" icon={CheckCircle2}>Confirmar</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}