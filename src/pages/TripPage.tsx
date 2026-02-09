import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Loader2, AlertTriangle, UserPlus, Wallet, Receipt, CheckCircle2 } from 'lucide-react'; 
import { User } from 'firebase/auth';

// Components
import Button from '../components/Button';
import Toast from '../components/Toast';
import TripHeader from '../components/trip/TripHeader';
import ExpensesList from '../components/trip/ExpensesList';
import BalancesView from '../components/trip/BalancesView';
import SettlementsView from '../components/trip/SettlementsView';
import TripModals from '../components/trip/TripModals'; // <--- Nou Orchestrator

// Context & Hooks
import { TripProvider, useTrip } from '../context/TripContext';
import { useTripCalculations } from '../hooks/useTripCalculations';
import { useTripModals } from '../hooks/useTripModals';
import { useTripFilters } from '../hooks/useTripFilters';
import { useTripMutations } from '../hooks/useTripMutations';
import { generatePDF } from '../utils/exportPdf';
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
  const { tripData, expenses, loading, error, currentUser, isMember } = useTrip();

  // 1. Hooks de Lògica
  const modals = useTripModals();
  const filters = useTripFilters();
  const { toast, clearToast, showToast, mutations } = useTripMutations();

  // 2. Càlculs (Ara optimitzats amb el servei pur)
  const { filteredExpenses, balances, categoryStats, settlements, totalGroupSpending, displayedTotal } = useTripCalculations(
    expenses, 
    tripData?.users || [], 
    filters.searchQuery, 
    filters.filterCategory
  );

  // --- RENDER LOADING/ERROR ---
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400"/></div>;
  if (error || !tripData) return <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950"><AlertTriangle className="text-red-500" size={40}/><p className="text-slate-600 dark:text-slate-300 font-bold">{error || "No s'ha trobat el viatge"}</p><Button variant="secondary" onClick={() => window.location.href='/'}>Tornar a l'inici</Button></div>;

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
        {/* Navegació de Pestanyes (Podria ser un component <TripTabs /> en el futur) */}
        <div className="flex p-1.5 bg-white dark:bg-slate-900 rounded-2xl mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
          {(['expenses', 'balances', 'settle'] as const).map(tab => (
            <button key={tab} onClick={() => filters.setActiveTab(tab)} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${filters.activeTab === tab ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                {tab === 'expenses' && <Receipt size={16} />}{tab === 'balances' && <Wallet size={16} />}{tab === 'settle' && <CheckCircle2 size={16} />}
                <span className="hidden sm:inline">{tab === 'expenses' ? 'Despeses' : tab === 'balances' ? 'Balanç' : 'Liquidar'}</span>
            </button>
          ))}
        </div>

        {/* Contingut de les Pestanyes */}
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
      
      {/* Botó Flotant */}
      <button 
        onClick={() => modals.openExpenseModal(null)} 
        className="fixed bottom-6 right-6 md:right-[calc(50%-350px)] bg-indigo-600 text-white p-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all z-40 shadow-indigo-200 dark:shadow-none active:scale-95"
      >
        <Plus size={28} />
      </button>
      
      {/* 4. MODALS ORCHESTRATOR */}
      <TripModals 
        tripData={tripData}
        users={users}
        currency={currency}
        modals={modals}
        mutations={mutations}
        showToast={showToast}
        canChangeCurrency={canChangeCurrency}
      />
    </div>
  );
}