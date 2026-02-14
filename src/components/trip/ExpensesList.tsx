import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Search, Receipt, ArrowRightLeft, Paperclip, Loader2, Filter } from 'lucide-react'; 
import { CATEGORIES } from '../../utils/constants';
import { Expense, CategoryId, TripUser } from '../../types';
import { formatCurrency, formatDateDisplay } from '../../utils/formatters';
import { useTrip } from '../../context/TripContext';

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

const ExpenseSkeleton = () => (
  <div className="bg-surface-card p-4 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 animate-pulse">
    <div className="w-12 h-12 rounded-2xl bg-surface-ground flex-shrink-0" />
    <div className="flex-1 space-y-2">
       <div className="h-4 bg-surface-ground rounded-full w-2/3" />
       <div className="h-3 bg-surface-ground rounded-full w-1/3" />
    </div>
    <div className="w-16 h-6 bg-surface-ground rounded-full" />
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

  return (
    <div className="space-y-2 animate-fade-in pb-32"> 
      
      {/* --- SEARCH & FILTERS (Sticky Millorat) --- */}
      {/* Z-Index: sticky (40) definit al tailwind.config */}
      <div className="flex flex-col gap-3 sticky top-0 z-sticky bg-surface-ground/95 backdrop-blur-xl py-4 -mx-4 px-4 transition-all border-b border-transparent shadow-sm shadow-slate-200/50 dark:shadow-none" role="search">
        {/* Search Input */}
        <div className="relative group">
          <label htmlFor="search-expenses" className="sr-only">Cerca despeses</label>
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-content-subtle group-focus-within:text-primary transition-colors w-5 h-5 pointer-events-none" aria-hidden="true" />
          <input 
            id="search-expenses"
            type="text"
            placeholder="Cerca per concepte..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-surface-card border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm text-content-body placeholder:text-content-subtle font-medium text-base"
          />
          {isSearching && (
             <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" aria-hidden="true" />
             </div>
          )}
        </div>
        
        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mask-gradient-right" role="tablist" aria-label="Filtre per categories">
            <button
                 onClick={() => setFilterCategory('all')}
                 role="tab"
                 aria-selected={filterCategory === 'all'}
                 className={`
                    flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm font-bold select-none active:scale-95 border
                    ${filterCategory === 'all'
                        ? 'bg-content-body text-surface-card border-content-body shadow-md' 
                        : 'bg-surface-card border-slate-200 dark:border-slate-800 text-content-muted hover:bg-slate-100 dark:hover:bg-slate-800'}
                 `}
            >
                <Filter size={14} aria-hidden="true" /> Tots
            </button>
            {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                <button
                    key={cat.id}
                    onClick={() => setFilterCategory(cat.id)}
                    role="tab"
                    aria-selected={filterCategory === cat.id}
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm font-bold select-none active:scale-95 border
                        ${filterCategory === cat.id 
                            ? 'bg-primary text-white border-primary shadow-md shadow-indigo-200/50 dark:shadow-none' 
                            : 'bg-surface-card border-slate-200 dark:border-slate-800 text-content-muted hover:bg-slate-100 dark:hover:bg-slate-800'}
                    `}
                >
                    <cat.icon className="w-4 h-4" aria-hidden="true" />
                    {cat.label}
                </button>
            ))}
        </div>
      </div>

      {/* --- EXPENSES LIST --- */}
      <div className="space-y-1" aria-busy={isSearching} aria-live="polite">
        {isSearching ? (
           <div className="space-y-4 pt-4">
             {Array.from({ length: 4 }).map((_, i) => <ExpenseSkeleton key={i} />)}
           </div>
        ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-content-subtle animate-fade-in text-center px-6 opacity-80">
                <div className="bg-surface-elevated p-8 rounded-full mb-6 shadow-financial-sm border border-slate-100 dark:border-slate-800">
                    <Receipt className="w-12 h-12 text-content-subtle" aria-hidden="true" />
                </div>
                <h3 className="font-bold text-xl text-content-body mb-2">No hi ha despeses</h3>
                <p className="text-sm text-content-muted max-w-[200px]">
                    {searchQuery || filterCategory !== 'all' 
                      ? "Prova de canviar els filtres de cerca." 
                      : "Afegeix la primera despesa per començar a repartir."}
                </p>
            </div>
        ) : (
            <ul className="relative space-y-3 pt-2">
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
                        {/* --- DATE HEADER (Smart Sticky) --- */}
                        {showDateHeader && (
                            // ADJUSTED: Top-32 (128px) to clear the search bar + pills safely
                            <li className="sticky top-32 z-20 py-3 flex justify-center pointer-events-none">
                                <div className={`
                                    px-4 py-1.5 rounded-full text-[11px] uppercase tracking-wider font-black shadow-sm backdrop-blur-md border
                                    ${isToday 
                                        ? 'bg-primary/90 text-white border-primary/20 shadow-indigo-500/20' 
                                        : 'bg-surface-elevated/95 text-content-muted border-slate-200/60 dark:border-slate-700/60'}
                                `}>
                                    {displayDate}
                                </div>
                            </li>
                        )}

                        {/* --- EXPENSE CARD --- */}
                        <li className="group">
                            <button 
                            type="button"
                            onClick={() => onEdit(expense)}
                            className="w-full text-left bg-surface-card p-4 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:z-10 shadow-sm hover:shadow-financial-md active:scale-[0.98]"
                            >
                            <div className="flex items-center justify-between gap-3 sm:gap-4">
                                
                                {/* 1. Icon & Main Info */}
                                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                    <div className={`
                                        w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors border shadow-sm
                                        ${isTransfer 
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30' 
                                            : `bg-${catColorBase}-50 text-${catColorBase}-600 border-${catColorBase}-100 dark:bg-${catColorBase}-900/20 dark:text-${catColorBase}-400 dark:border-${catColorBase}-900/30`
                                        }
                                    `}>
                                        {isTransfer ? <ArrowRightLeft size={20} aria-hidden="true" /> : <category.icon size={20} aria-hidden="true" />}
                                    </div>
                                    
                                    <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-content-body truncate text-base leading-snug">
                                                {expense.title}
                                            </span>
                                            {expense.receiptUrl && <Paperclip size={12} className="text-content-subtle flex-shrink-0" />}
                                        </div>
                                        
                                        <div className="flex items-center gap-2 text-xs text-content-muted truncate">
                                             {/* Payer Name Simple */}
                                             <span className="font-semibold text-content-body">{payerName}</span>
                                             <span className="text-content-subtle">•</span>
                                             <span>
                                                {isTransfer 
                                                    ? <span className="flex items-center gap-1">➜ {expense.involved[0] ? getUserName(expense.involved[0]) : 'Tothom'}</span>
                                                    : (expense.splitType === 'equal' ? `${expense.involved.length} pers` : 'Ajustat')
                                                }
                                             </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Amount */}
                                <div className="flex flex-col items-end pl-2">
                                    <span className={`font-black text-lg tracking-tight tabular-nums ${isTransfer ? 'text-status-success' : 'text-content-body'}`}>
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
          <div ref={observerTarget} className="h-24 flex items-center justify-center w-full text-content-subtle opacity-50">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}