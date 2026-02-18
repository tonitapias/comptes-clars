// src/pages/TripPage.tsx
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
import { CategoryId, unbrand } from '../types'; // CORRECCIÓ: Importem unbrand

interface TripPageProps {
  user: User | null;
}

// --- WRAPPER ---
export default function TripPageWrapper({ user }: TripPageProps) {
  const { tripId } = useParams<{ tripId: string }>();
  if (!tripId) return null; 
  
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
  const { 
    filteredExpenses, 
    balances, 
    categoryStats, 
    settlements, 
    totalGroupSpending, 
    displayedTotal, 
    isSearching 
  } = useTripCalculations(
    expenses, 
    tripData?.users || [], 
    filters.searchQuery, 
    filters.filterCategory
  );

  // 3. CALCULAR BALANÇ PERSONAL (CORREGIT)
  const userBalance = (() => {
    if (!currentUser || !tripData) return 0;
    
    // Busquem l'usuari del viatge
    const tripUser = tripData.users.find(u => u.id === currentUser.uid);
    if (!tripUser) return 0;

    // Busquem el balanç dins l'array de balanços
    const bal = balances.find(b => b.userId === tripUser.id);
    
    // Retornem el valor numèric des-marcat (unbranded) o 0
    return bal ? unbrand(bal.amount) : 0;
  })();

  // 4. HANDLERS
  const handleCategorySelect = (categoryId: string) => {
    filters.setFilterCategory(categoryId as CategoryId);
    filters.setActiveTab('expenses');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenSettings = () => modals.setSettingsOpen(true);
  const handleOpenMembers = () => modals.openGroupModal('members');
  const handleOpenShare = () => modals.openGroupModal('share');
  const handleOpenActivity = () => modals.setActivityOpen(true);
  const handleAddExpense = () => modals.openExpenseModal(null);
  const handleReturnHome = () => { window.location.href = '/'; };
  
  const handleExportPDF = () => {
    if (!tripData) return;
    const { currency = CURRENCIES[0] } = tripData;
    generatePDF(
      tripData.name, 
      expenses, 
      balances, 
      settlements, 
      tripData.users, 
      currency.symbol
    );
  };

  // --- RENDERS AUXILIARS ---
  const renderExpenses = () => {
    const isEmptyState = expenses.length === 0 && !filters.searchQuery && filters.filterCategory === 'all';
    
    if (isEmptyState) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in opacity-60">
            <Receipt size={64} className="text-slate-300 dark:text-slate-700 mb-6" strokeWidth={1} />
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Comencem?</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-xs mb-8">Afegeix la primera despesa i oblida't dels càlculs.</p>
            <Button onClick={handleAddExpense} icon={Plus} className="shadow-lg shadow-indigo-200 dark:shadow-none">Afegir Despesa</Button>
        </div>
      );
    }

    return (
      <ExpensesList 
        expenses={filteredExpenses} 
        searchQuery={filters.searchQuery} 
        setSearchQuery={filters.setSearchQuery} 
        filterCategory={filters.filterCategory} 
        setFilterCategory={filters.setFilterCategory} 
        onEdit={modals.openExpenseModal}
        isSearching={isSearching} 
      />
    );
  };

  const renderBalances = () => (
    <BalancesView 
      balances={balances} 
      categoryStats={categoryStats} 
      onFilterCategory={handleCategorySelect} 
    />
  );

  const renderSettlements = () => (
    <SettlementsView 
      settlements={settlements} 
      onSettle={modals.setSettleModalData} 
    />
  );

  // --- ESTATS DE CÀRREGA I ERROR ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={32} />
      </div>
    );
  }

  if (error || !tripData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 bg-slate-50 dark:bg-slate-950 text-center">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500">
           <AlertTriangle size={32}/>
        </div>
        <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Viatge no trobat</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm">{error || "No s'ha pogut carregar la informació del viatge."}</p>
        </div>
        <Button variant="secondary" onClick={handleReturnHome}>Tornar a l'inici</Button>
      </div>
    );
  }

  const { currency = CURRENCIES[0], users = [] } = tripData;
  const canChangeCurrency = expenses.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-500">
      
      {toast && <Toast message={toast.msg} type={toast.type} onClose={clearToast} />}
      
      {/* HEADER AMB FLUX NATURAL */}
      <TripHeader 
        displayedTotal={displayedTotal} 
        totalGroupSpending={totalGroupSpending}
        userBalance={userBalance} // Connectat correctament
        isFiltered={!!filters.searchQuery || filters.filterCategory !== 'all'}
        onOpenSettings={handleOpenSettings}
        onOpenGroup={handleOpenMembers}
        onExportPDF={handleExportPDF}
        onOpenShare={handleOpenShare}
        onOpenActivity={handleOpenActivity}
      />

      {/* BANNER DE CONVIDAT */}
      {!isMember && currentUser && (
          <div className="mx-4 mt-2 mb-4 p-4 rounded-2xl bg-indigo-600 dark:bg-indigo-900 text-white shadow-lg relative z-20 animate-fade-in-up">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
                  <div>
                    <p className="font-bold text-sm">Mode Convidat</p>
                    <p className="text-xs opacity-80">Uneix-te per sincronitzar les teves dades.</p>
                  </div>
                  <button 
                    onClick={mutations.joinTrip} 
                    className="bg-white text-indigo-700 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wide shadow-sm hover:bg-indigo-50 active:scale-95 transition-all w-full md:w-auto flex items-center justify-center gap-2"
                  >
                    <UserPlus size={14} strokeWidth={3}/> Unir-me
                  </button>
              </div>
          </div>
      )}

      {/* COS PRINCIPAL */}
      <main className="max-w-3xl mx-auto px-4 pb-32 relative z-10">
        
        {/* TAB NAVIGATION */}
        <div 
          className="flex p-1.5 bg-white dark:bg-slate-900 rounded-2xl mb-6 shadow-sm border border-slate-100 dark:border-slate-800"
          role="tablist"
        >
          {(['expenses', 'balances', 'settle'] as const).map(tab => {
            const isActive = filters.activeTab === tab;
            return (
              <button 
                key={tab} 
                onClick={() => filters.setActiveTab(tab)} 
                role="tab"
                aria-selected={isActive}
                className={`
                  flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 relative z-10
                  ${isActive 
                    ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 shadow-sm scale-100' 
                    : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 scale-95 opacity-80'
                  }
                `}
              >
                  {tab === 'expenses' && <Receipt size={16} strokeWidth={isActive ? 2.5 : 2} />}
                  {tab === 'balances' && <Wallet size={16} strokeWidth={isActive ? 2.5 : 2} />}
                  {tab === 'settle' && <CheckCircle2 size={16} strokeWidth={isActive ? 2.5 : 2} />}
                  
                  <span>
                    {tab === 'expenses' ? 'Despeses' : tab === 'balances' ? 'Balanç' : 'Saldar'}
                  </span>
              </button>
            );
          })}
        </div>

        {/* CONTENT AREA */}
        <div className="animate-fade-in min-h-[300px]">
          {filters.activeTab === 'expenses' && renderExpenses()}
          {filters.activeTab === 'balances' && renderBalances()}
          {filters.activeTab === 'settle' && renderSettlements()}
        </div>
      </main>
      
      {/* FLOATING ACTION BUTTON (FAB) */}
      <button 
        onClick={handleAddExpense} 
        className="
            fixed bottom-8 right-6 md:right-[max(1.5rem,calc(50%-350px))]
            w-16 h-16 rounded-[2rem]
            bg-slate-900 dark:bg-white
            text-white dark:text-slate-900
            shadow-2xl shadow-slate-900/30 dark:shadow-white/10
            flex items-center justify-center
            hover:scale-110 hover:-translate-y-1 active:scale-90 active:translate-y-0
            transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
            z-50 group
        "
        aria-label="Afegir nova despesa"
      >
        <Plus size={32} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-500" />
      </button>
      
      {/* MODALS LAYER */}
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