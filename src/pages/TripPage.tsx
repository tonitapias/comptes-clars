// src/pages/TripPage.tsx
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
import TripModals from '../components/trip/TripModals'; 

// Context & Hooks
import { TripProvider, useTrip } from '../context/TripContext';
import { useTripCalculations } from '../hooks/useTripCalculations';
import { useTripModals } from '../hooks/useTripModals';
import { useTripFilters } from '../hooks/useTripFilters';
import { useTripMutations } from '../hooks/useTripMutations';
import { generatePDF } from '../utils/exportPdf';
import { CURRENCIES } from '../utils/constants';
import { CategoryId } from '../types';

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

  // 2. Càlculs
  const { filteredExpenses, balances, categoryStats, settlements, totalGroupSpending, displayedTotal, isSearching } = useTripCalculations(
    expenses, 
    tripData?.users || [], 
    filters.searchQuery, 
    filters.filterCategory
  );

  // 3. HANDLER PER A GRÀFICS INTERACTIUS (Opció C)
  const handleCategorySelect = (categoryId: string) => {
    // Canviem el filtre i la pestanya automàticament
    filters.setFilterCategory(categoryId as CategoryId);
    filters.setActiveTab('expenses');
    // Scroll suau cap amunt per veure la llista
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- RENDER LOADING/ERROR ---
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400"/></div>;
  if (error || !tripData) return <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950"><AlertTriangle className="text-red-500" size={40}/><p className="text-slate-600 dark:text-slate-300 font-bold">{error || "No s'ha trobat el viatge"}</p><Button variant="secondary" onClick={() => window.location.href='/'}>Tornar a l'inici</Button></div>;

  const { currency = CURRENCIES[0], users = [] } = tripData;
  const canChangeCurrency = expenses.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 pb-24 md:pb-10 transition-colors duration-300 relative">
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
        
        {/* Navegació de Pestanyes Accessible (ARIA Tabs) */}
        <div 
          className="flex p-1.5 bg-white dark:bg-slate-900 rounded-2xl mb-6 shadow-sm border border-slate-200 dark:border-slate-800"
          role="tablist"
          aria-label="Vistes del viatge"
        >
          {(['expenses', 'balances', 'settle'] as const).map(tab => {
            const isActive = filters.activeTab === tab;
            return (
              <button 
                key={tab} 
                onClick={() => filters.setActiveTab(tab)} 
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab}`}
                id={`tab-${tab}`}
                tabIndex={isActive ? 0 : -1}
                className={`
                  flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 relative z-10
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-offset-slate-900
                  ${isActive 
                    ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 shadow-md ring-1 ring-indigo-200 dark:ring-indigo-500/30' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 border border-transparent'
                  }
                `}
              >
                  {tab === 'expenses' && <Receipt size={16} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />}
                  {tab === 'balances' && <Wallet size={16} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />}
                  {tab === 'settle' && <CheckCircle2 size={16} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />}
                  
                  <span className={isActive ? "inline" : "hidden sm:inline"}>
                    {tab === 'expenses' ? 'Despeses' : tab === 'balances' ? 'Balanç' : 'Liquidar'}
                  </span>
              </button>
            );
          })}
        </div>

        {/* Contingut de les Pestanyes (Tabpanels) */}
        <div className="relative min-h-[400px]">
          {filters.activeTab === 'expenses' && (
              <div role="tabpanel" id="panel-expenses" aria-labelledby="tab-expenses" className="animate-fade-in focus:outline-none" tabIndex={0}>
                {expenses.length === 0 && !filters.searchQuery && filters.filterCategory === 'all' ? (
                <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
                    <Receipt size={48} className="text-indigo-400 dark:text-indigo-500 mb-4" aria-hidden="true" />
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
                    isSearching={isSearching} 
                />
                )}
              </div>
          )}

          {filters.activeTab === 'balances' && (
             <div role="tabpanel" id="panel-balances" aria-labelledby="tab-balances" className="animate-fade-in focus:outline-none" tabIndex={0}>
                <BalancesView 
                  balances={balances} 
                  categoryStats={categoryStats} 
                  onFilterCategory={handleCategorySelect} 
                />
             </div>
          )}

          {filters.activeTab === 'settle' && (
             <div role="tabpanel" id="panel-settle" aria-labelledby="tab-settle" className="animate-fade-in focus:outline-none" tabIndex={0}>
                <SettlementsView settlements={settlements} onSettle={modals.setSettleModalData} />
             </div>
          )}
        </div>
      </main>
      
      {/* FAB */}
      <button 
        onClick={() => modals.openExpenseModal(null)} 
        className="
            fixed bottom-8 right-6 md:right-[calc(50%-350px)] 
            bg-gradient-to-r from-indigo-600 to-indigo-500 
            text-white p-4 rounded-2xl 
            shadow-xl shadow-indigo-500/40 
            dark:shadow-indigo-900/20 dark:border dark:border-white/10
            hover:shadow-2xl hover:shadow-indigo-500/50 hover:scale-105 hover:-translate-y-1
            active:scale-95 active:translate-y-0
            transition-all duration-300 ease-out z-40 
            focus:outline-none focus:ring-4 focus:ring-indigo-500/30
            animate-scale-in
        "
        aria-label="Afegir nova despesa"
      >
        <Plus size={28} strokeWidth={2.5} aria-hidden="true" />
      </button>
      
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