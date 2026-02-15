import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Search, Receipt, ArrowRightLeft, Paperclip, Loader2, Filter, CalendarDays, X } from 'lucide-react'; 
import { CATEGORIES } from '../../utils/constants';
import { Expense, CategoryId, TripUser } from '../../types';
import { formatCurrency, formatDateDisplay } from '../../utils/formatters';
import { useTrip } from '../../context/TripContext';
// UX ADDITION: Feedback hàptic
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

interface ExpensesListProps {
  expenses: Expense[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterCategory: CategoryId | 'all';
  setFilterCategory: (c: CategoryId | 'all') => void;
  onEdit: (e: Expense | null) => void;
  isSearching: boolean;
}

const PAGE_SIZE = 20;

// CONSTANT VISUAL: Ajustada per evitar solapaments amb el header de filtres
const STICKY_TOP_OFFSET = "top-[8.5rem]"; 

const ExpenseSkeleton = () => (
  <div className="bg-surface-card p-4 rounded-[1.25rem] border border-slate-100 dark:border-slate-800 flex items-center gap-4 animate-pulse">
    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex-shrink-0" />
    <div className="flex-1 space-y-2.5">
       <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-2/3" />
       <div className="h-3 bg-slate-50 dark:bg-slate-800/50 rounded-full w-1/3" />
    </div>
    <div className="w-16 h-6 bg-slate-100 dark:bg-slate-800 rounded-full" />
  </div>
);

export default function ExpensesList({ 
  expenses, 
  searchQuery, 
  setSearchQuery, 
  filterCategory, 
  setFilterCategory,
  onEdit,
  isSearching
}: ExpensesListProps) {
  const { tripData } = useTrip();
  const { trigger } = useHapticFeedback();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const observerTarget = useRef<HTMLDivElement>(null);

  const userMap = useMemo(() => {
    if (!tripData?.users) return {};
    return tripData.users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, TripUser>);
  }, [tripData?.users]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, filterCategory, expenses]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + PAGE_SIZE);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [expenses.length, isSearching, visibleCount]); 

  const getUserName = (id: string) => userMap[id]?.name || 'Desconegut';
  const visibleExpenses = expenses.slice(0, visibleCount);
  const hasMore = visibleCount < expenses.length;

  if (!tripData) return null;
  const { currency } = tripData;

  const handleClearSearch = () => {
    trigger('light');
    setSearchQuery('');
  };

  const handleCategoryClick = (catId: CategoryId | 'all') => {
    trigger('light');
    setFilterCategory(catId);
  };

  const handleExpenseClick = (expense: Expense) => {
    trigger('light');
    onEdit(expense);
  };

  return (
    <div className="space-y-2 animate-fade-in pb-32 min-h-[60vh]"> 
      
      {/* --- HEADER: SEARCH & FILTERS (Sticky Glassmorphism) --- */}
      <header 
        className="sticky top-0 z-40 -mx-4 px-4 pt-4 pb-2 transition-all duration-300"
        role="search"
      >
        {/* Fons Glassmorphism millorat amb degradat inferior per suavitzar el tall */}
        <div className="absolute inset-0 bg-surface-ground/90 dark:bg-surface-ground/95 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm transition-all z-0" />
        
        {/* Gradient fade out al bottom del header */}
        <div className="absolute bottom-[-20px] left-0 right-0 h-[20px] bg-gradient-to-b from-surface-ground/90 to-transparent pointer-events-none z-0" />

        <div className="relative z-10 flex flex-col gap-3">
            {/* Search Input */}
            <div className="relative group">
                <label htmlFor="search-expenses" className="sr-only">Cerca despeses</label>
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors pointer-events-none">
                    <Search className="w-5 h-5" aria-hidden="true" strokeWidth={2.5} />
                </div>
                <input 
                    id="search-expenses"
                    type="text"
                    placeholder="Buscar per títol..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 bg-surface-card/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm text-content-body placeholder:text-slate-400 font-bold text-base appearance-none backdrop-blur-md"
                />
                
                {isSearching ? (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" aria-hidden="true" />
                    </div>
                ) : searchQuery && (
                    <button 
                        onClick={handleClearSearch}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 transition-colors active:scale-90"
                        aria-label="Esborrar cerca"
                    >
                        <X size={16} strokeWidth={3} />
                    </button>
                )}
            </div>
            
            {/* Category Pills (Scrollable) */}
            <div className="relative -mx-1 px-1">
                <div 
                    className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar mask-gradient-right pr-8 snap-x" 
                    role="tablist" 
                    aria-label="Filtre per categories"
                >
                    <button
                        onClick={() => handleCategoryClick('all')}
                        role="tab"
                        aria-selected={filterCategory === 'all'}
                        className={`
                            snap-start flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm font-bold select-none active:scale-95 border
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary
                            ${filterCategory === 'all'
                                ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent shadow-md transform scale-105' 
                                : 'bg-surface-card border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}
                        `}
                    >
                        <Filter size={14} aria-hidden="true" strokeWidth={2.5} /> Tots
                    </button>
                    {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => handleCategoryClick(cat.id)}
                            role="tab"
                            aria-selected={filterCategory === cat.id}
                            className={`
                                snap-start flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm font-bold select-none active:scale-95 border
                                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary
                                ${filterCategory === cat.id 
                                    ? 'bg-primary text-white border-primary shadow-md shadow-indigo-500/20 transform scale-105' 
                                    : 'bg-surface-card border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}
                            `}
                        >
                            <cat.icon className="w-4 h-4" aria-hidden="true" strokeWidth={2.5} />
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </header>

      {/* --- EXPENSES LIST --- */}
      <main className="space-y-3" aria-busy={isSearching} aria-live="polite">
        {isSearching ? (
           <div className="space-y-4 pt-4 px-1">
             {Array.from({ length: 5 }).map((_, i) => <ExpenseSkeleton key={i} />)}
           </div>
        ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-content-subtle animate-fade-in text-center px-6 opacity-80">
                <div className="bg-slate-100 dark:bg-slate-800/50 p-8 rounded-full mb-6 shadow-inner">
                    <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                </div>
                <h3 className="font-bold text-xl text-slate-700 dark:text-slate-200 mb-2">
                    {searchQuery ? 'Cap resultat' : 'Llista buida'}
                </h3>
                <p className="text-sm text-slate-500 max-w-[200px] leading-relaxed mx-auto">
                    {searchQuery || filterCategory !== 'all' 
                      ? "Prova de canviar els filtres de cerca." 
                      : "Afegeix la primera despesa del viatge."}
                </p>
            </div>
        ) : (
            <ul className="relative space-y-4 pt-2 pb-6">
              {visibleExpenses.map((expense, index) => {
                  const category = CATEGORIES.find(c => c.id === expense.category) || CATEGORIES[0];
                  const isTransfer = expense.category === 'transfer';
                  const payerName = getUserName(expense.payer);
                  const catColorBase = category.color.split('-')[1];

                  const showDateHeader = index === 0 || expense.date !== visibleExpenses[index - 1].date;
                  const displayDate = formatDateDisplay(expense.date); 
                  const isToday = displayDate.toLowerCase().includes('avui') || displayDate.toLowerCase().includes('today');

                  return (
                    <React.Fragment key={expense.id}>
                        {/* --- DATE HEADER (Improved Sticky) --- */}
                        {showDateHeader && (
                            <li className={`sticky ${STICKY_TOP_OFFSET} z-30 flex justify-center pointer-events-none py-2`}>
                                <div className={`
                                    flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] uppercase tracking-widest font-black shadow-sm border backdrop-blur-md transition-all
                                    ${isToday 
                                        ? 'bg-indigo-600/90 text-white border-indigo-500/50 shadow-indigo-500/20' 
                                        : 'bg-white/80 dark:bg-slate-800/80 text-slate-500 border-slate-200/50 dark:border-slate-700/50 shadow-sm'}
                                `}>
                                    <CalendarDays size={11} className={isToday ? 'text-white' : 'text-slate-400'} strokeWidth={2.5} />
                                    {displayDate}
                                </div>
                            </li>
                        )}

                        {/* --- EXPENSE CARD --- */}
                        <li className="group px-1">
                            <button 
                                type="button"
                                onClick={() => handleExpenseClick(expense)}
                                className="w-full text-left bg-surface-card p-4 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all cursor-pointer relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:z-10 shadow-sm hover:shadow-financial-md active:scale-[0.98] group"
                            >
                                <div className="flex items-center justify-between gap-3 sm:gap-4">
                                    
                                    {/* Left: Icon & Main Info */}
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={`
                                            w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors border shadow-sm group-hover:scale-105 duration-300
                                            ${isTransfer 
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30' 
                                                : `bg-${catColorBase}-50 text-${catColorBase}-600 border-${catColorBase}-100 dark:bg-${catColorBase}-900/20 dark:text-${catColorBase}-400 dark:border-${catColorBase}-900/30`
                                            }
                                        `}>
                                            {isTransfer ? <ArrowRightLeft size={20} aria-hidden="true" strokeWidth={2} /> : <category.icon size={20} aria-hidden="true" strokeWidth={2} />}
                                        </div>
                                        
                                        <div className="flex flex-col min-w-0 flex-1 gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold text-base leading-tight truncate ${isTransfer ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>
                                                    {expense.title}
                                                </span>
                                                {expense.receiptUrl && <Paperclip size={14} className="text-indigo-400 flex-shrink-0" />}
                                            </div>
                                            
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                                                <span className="text-slate-600 dark:text-slate-300 font-bold">{payerName}</span>
                                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                                <span className="truncate">
                                                    {isTransfer 
                                                        ? <span className="flex items-center gap-1">➜ {expense.involved[0] ? getUserName(expense.involved[0]) : 'Tothom'}</span>
                                                        : (expense.splitType === 'equal' ? `${expense.involved.length} persones` : 'Repartiment manual')
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Amount */}
                                    <div className="flex flex-col items-end pl-2">
                                        <span className={`font-black text-lg sm:text-xl tracking-tight tabular-nums ${isTransfer ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                            {formatCurrency(expense.amount, currency)}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        </li>
                    </React.Fragment>
                  );
              })}
            </ul>
        )}
        
        {/* Loader Final */}
        {hasMore && !isSearching && (
          <div ref={observerTarget} className="h-24 flex items-center justify-center w-full text-slate-400 opacity-50">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
}