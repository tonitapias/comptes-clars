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

// COLORS D'AVATAR: Mantinguts però suavitzats per al nou mode fosc
const getAvatarColor = (name: string) => {
  const colors = [
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800', 
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800', 
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', 
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200 dark:border-pink-800',
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const PAGE_SIZE = 20;

const ExpenseSkeleton = () => (
  // Refactor: bg-white -> bg-surface-card
  <div className="bg-surface-card p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 animate-pulse">
    <div className="w-12 h-12 rounded-2xl bg-surface-ground flex-shrink-0" />
    <div className="flex-1 space-y-2">
       <div className="h-4 bg-surface-ground rounded w-3/4" />
       <div className="h-3 bg-surface-ground rounded w-1/2" />
    </div>
    <div className="w-16 h-6 bg-surface-ground rounded" />
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
    <div className="space-y-6 animate-fade-in pb-24">
      
      {/* --- SEARCH & FILTERS (Sticky) --- */}
      {/* Refactor: backdrop i colors semàntics */}
      <div className="flex flex-col gap-4 sticky top-0 z-30 bg-surface-ground/95 backdrop-blur-md py-3 -mx-4 px-4 border-b border-transparent transition-all shadow-sm" role="search">
        <div className="relative group">
          <label htmlFor="search-expenses" className="sr-only">Cerca despeses</label>
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-content-subtle group-focus-within:text-primary transition-colors w-5 h-5 pointer-events-none" aria-hidden="true" />
          <input 
            id="search-expenses"
            type="text"
            placeholder="Cerca per concepte, persona..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            // Refactor: bg-white -> bg-surface-card, text colors
            className="w-full pl-12 pr-4 py-3.5 bg-surface-card border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm text-content-body placeholder:text-content-subtle font-medium text-base"
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
                    flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-xs font-bold border select-none active:scale-95
                    ${filterCategory === 'all'
                        ? 'bg-content-body text-surface-card border-content-body shadow-md' 
                        : 'bg-surface-card text-content-muted border-slate-200 hover:border-slate-300 dark:border-slate-800'}
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
                        flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-xs font-bold border select-none active:scale-95
                        ${filterCategory === cat.id 
                            ? 'bg-primary text-white border-primary shadow-md shadow-indigo-200/50 dark:shadow-none' 
                            : 'bg-surface-card text-content-muted border-slate-200 hover:border-slate-300 dark:border-slate-800'}
                    `}
                >
                    <cat.icon className="w-4 h-4" aria-hidden="true" />
                    {cat.label}
                </button>
            ))}
        </div>
      </div>

      {/* --- EXPENSES LIST --- */}
      <div className="space-y-0" aria-busy={isSearching} aria-live="polite">
        {isSearching ? (
           <div className="space-y-4">
             {Array.from({ length: 4 }).map((_, i) => <ExpenseSkeleton key={i} />)}
           </div>
        ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-content-subtle animate-fade-in">
                <div className="bg-surface-elevated p-6 rounded-full mb-4">
                    <Receipt className="w-10 h-10 opacity-50" aria-hidden="true" />
                </div>
                <p className="font-medium">No s'han trobat despeses</p>
            </div>
        ) : (
            <ul className="space-y-3 relative">
              {visibleExpenses.map((expense, index) => {
                  const category = CATEGORIES.find(c => c.id === expense.category) || CATEGORIES[0];
                  const isTransfer = expense.category === 'transfer';
                  const payerName = getUserName(expense.payer);
                  const payerPhoto = userMap[expense.payer]?.photoUrl;
                  const catColorBase = category.color.split('-')[1];

                  const showDateHeader = index === 0 || expense.date !== visibleExpenses[index - 1].date;
                  const displayDate = formatDateDisplay(expense.date); 
                  const isToday = displayDate.toLowerCase().includes('avui') || displayDate.toLowerCase().includes('today');

                  return (
                    <React.Fragment key={expense.id}>
                        {/* --- DATE HEADER --- */}
                        {showDateHeader && (
                            // Refactor: top-32 (128px) és més estàndard que 135px. 
                            // text-xxs per la data.
                            <li className="sticky top-32 z-20 py-4 flex justify-center pointer-events-none">
                                <div className={`
                                    px-4 py-1.5 rounded-full text-xxs font-bold shadow-sm backdrop-blur-xl border select-none
                                    ${isToday 
                                        ? 'bg-primary text-white border-primary shadow-indigo-200/50 dark:shadow-none' 
                                        : 'bg-surface-ground/90 text-content-muted border-slate-200 dark:border-slate-700'}
                                `}>
                                    {displayDate}
                                </div>
                            </li>
                        )}

                        {/* --- EXPENSE CARD --- */}
                        <li className="group px-1">
                            <button 
                            type="button"
                            onClick={() => onEdit(expense)}
                            // Refactor: bg-surface-card, focus-visible ring
                            className="w-full text-left bg-surface-card p-3.5 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:z-10 shadow-sm hover:shadow-md active:scale-[0.98] active:bg-surface-ground"
                            >
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                    {/* ICON */}
                                    <div className={`
                                        w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors border shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/5
                                        ${isTransfer 
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50' 
                                            : `bg-${catColorBase}-50 text-${catColorBase}-600 border-${catColorBase}-100 dark:bg-${catColorBase}-900/20 dark:text-${catColorBase}-400 dark:border-${catColorBase}-900/50`
                                        }
                                    `}>
                                        {isTransfer ? <ArrowRightLeft className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" /> : <category.icon className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />}
                                    </div>
                                    
                                    {/* INFO */}
                                    <div className="flex flex-col min-w-0 flex-1 gap-1">
                                        <div className="flex items-center gap-2">
                                            {/* text-content-body */}
                                            <span className="font-bold text-content-body truncate text-base leading-tight group-hover:text-primary transition-colors">
                                                {expense.title}
                                            </span>
                                            {expense.receiptUrl && <Paperclip className="w-3.5 h-3.5 text-content-subtle flex-shrink-0" aria-label="Amb rebut adjunt" />}
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-content-muted">
                                            {/* Payer */}
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                {/* text-xxs */}
                                                <span className="text-xxs uppercase font-bold text-content-subtle tracking-wider hidden sm:inline-block">Pagat per</span>
                                                <div className="flex items-center gap-1 bg-surface-ground px-1.5 py-0.5 rounded-md border border-slate-100 dark:border-slate-700">
                                                    {/* Avatar colors es mantenen, només text size */}
                                                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${getAvatarColor(payerName)}`}>
                                                        {payerPhoto ? (
                                                            <img src={payerPhoto} alt="" className="w-full h-full object-cover rounded-full" />
                                                        ) : payerName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="truncate max-w-[80px] font-semibold text-content-body">{payerName}</span>
                                                </div>
                                            </div>
                                            
                                            <span className="text-content-subtle">•</span>

                                            {/* Split Info */}
                                            <span className="truncate text-content-muted text-xs">
                                                {isTransfer 
                                                    ? <span className="flex items-center gap-1">enviat a <span className="font-bold text-content-body">{expense.involved[0] ? getUserName(expense.involved[0]) : 'Tothom'}</span></span>
                                                    : (expense.splitType === 'equal' ? `${expense.involved.length} persones` : (expense.splitType === 'exact' ? 'Import exacte' : 'Per parts'))
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* AMOUNT */}
                                <div className="flex flex-col items-end pl-2">
                                    <span className={`font-black text-lg tracking-tight whitespace-nowrap tabular-nums ${isTransfer ? 'text-status-success' : 'text-content-body'}`}>
                                        {formatCurrency(expense.amount, currency)}
                                    </span>
                                    {expense.originalCurrency && expense.originalCurrency !== currency.code && (
                                        <span className="text-xxs font-bold text-content-muted bg-surface-ground border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-md whitespace-nowrap mt-1 tabular-nums">
                                            {expense.originalAmount?.toFixed(2)} {expense.originalCurrency}
                                        </span>
                                    )}
                                </div>
                            </div>
                            </button>
                        </li>
                    </React.Fragment>
                  );
              })}
            </ul>
        )}
        
        {/* Infinite Scroll Loader */}
        {hasMore && !isSearching && (
          <div ref={observerTarget} className="h-24 flex items-center justify-center w-full">
            <Loader2 className="w-6 h-6 animate-spin text-content-subtle" />
          </div>
        )}
      </div>
    </div>
  );
}