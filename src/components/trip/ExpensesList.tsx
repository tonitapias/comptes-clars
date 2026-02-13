import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Search, Receipt, ArrowRightLeft, Paperclip, Loader2, Filter, CalendarDays } from 'lucide-react'; 
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

// Helper per colors d'avatar consistents
const getAvatarColor = (name: string) => {
  const colors = [
    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800', 
    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800', 
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', 
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 border-pink-200 dark:border-pink-800',
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const PAGE_SIZE = 20;

const ExpenseSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 animate-pulse">
    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex-shrink-0" />
    <div className="flex-1 space-y-2">
       <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
       <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
    </div>
    <div className="w-16 h-6 bg-slate-100 dark:bg-slate-800 rounded" />
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
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* --- SEARCH & FILTERS (Sticky) --- */}
      <div className="flex flex-col gap-4 sticky top-0 z-30 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md py-3 -mx-4 px-4 border-b border-transparent transition-all" role="search">
        <div className="relative group">
          <label htmlFor="search-expenses" className="sr-only">Cerca despeses</label>
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors w-5 h-5 pointer-events-none" aria-hidden="true" />
          <input 
            id="search-expenses"
            type="text"
            placeholder="Cerca per concepte, persona..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 font-medium"
          />
          {isSearching && (
             <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" aria-hidden="true" />
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
                    flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-xs font-bold border select-none
                    ${filterCategory === 'all'
                        ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'}
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
                        flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-xs font-bold border select-none
                        ${filterCategory === cat.id 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-none' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'}
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
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-600 animate-fade-in">
                <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4">
                    <Receipt className="w-10 h-10 opacity-50" aria-hidden="true" />
                </div>
                <p className="font-medium">No s'han trobat despeses</p>
            </div>
        ) : (
            <ul className="space-y-1">
              {visibleExpenses.map((expense, index) => {
                  const category = CATEGORIES.find(c => c.id === expense.category) || CATEGORIES[0];
                  const isTransfer = expense.category === 'transfer';
                  const payerName = getUserName(expense.payer);
                  const payerPhoto = userMap[expense.payer]?.photoUrl;
                  const catColorBase = category.color.split('-')[1];

                  // LOGICA DATE HEADER: Mostrar si és el primer element o si la data canvia respecte l'anterior
                  const showDateHeader = index === 0 || expense.date !== visibleExpenses[index - 1].date;
                  const displayDate = formatDateDisplay(expense.date); 
                  const isToday = displayDate.toLowerCase().includes('avui') || displayDate.toLowerCase().includes('today');

                  return (
                    <React.Fragment key={expense.id}>
                        {/* --- DATE HEADER --- */}
                        {showDateHeader && (
                            <li className="sticky top-[140px] z-20 pt-6 pb-3 px-2 flex items-center gap-3 select-none pointer-events-none">
                                <div className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md border 
                                    ${isToday 
                                        ? 'bg-indigo-600/90 text-white border-indigo-500' 
                                        : 'bg-slate-200/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-300/50 dark:border-slate-700'}
                                `}>
                                    {displayDate}
                                </div>
                                <div className="h-px flex-grow bg-gradient-to-r from-slate-200 dark:from-slate-800 to-transparent"></div>
                            </li>
                        )}

                        {/* --- EXPENSE CARD --- */}
                        <li className="group">
                            <button 
                            type="button"
                            onClick={() => onEdit(expense)}
                            className="w-full text-left bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:z-10 shadow-sm hover:shadow-md active:scale-[0.99] mb-3"
                            >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                                {/* ICON */}
                                <div className={`
                                    w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors border shadow-sm
                                    ${isTransfer 
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50' 
                                        : `bg-${catColorBase}-50 text-${catColorBase}-600 border-${catColorBase}-100 dark:bg-${catColorBase}-900/20 dark:text-${catColorBase}-400 dark:border-${catColorBase}-900/50`
                                    }
                                `}>
                                    {isTransfer ? <ArrowRightLeft className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" /> : <category.icon className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />}
                                </div>
                                
                                {/* INFO */}
                                <div className="flex flex-col min-w-0 flex-1 pt-0.5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-slate-900 dark:text-slate-100 truncate text-base leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {expense.title}
                                        </span>
                                        {expense.receiptUrl && <Paperclip className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-label="Amb rebut adjunt" />}
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                        {/* Payer */}
                                        <div className="flex items-center gap-1.5 min-w-0 bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded-md border border-slate-100 dark:border-slate-800">
                                            <span className="text-[10px] text-slate-400 uppercase tracking-wide">Pagat per</span>
                                            <div className="flex items-center gap-1">
                                                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${getAvatarColor(payerName)}`}>
                                                    {payerPhoto ? (
                                                        <img src={payerPhoto} alt="" className="w-full h-full object-cover rounded-full" />
                                                    ) : payerName.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="truncate max-w-[80px] font-semibold text-slate-700 dark:text-slate-300">{payerName}</span>
                                            </div>
                                        </div>
                                        
                                        {/* Split Info */}
                                        <span className="truncate text-slate-400 dark:text-slate-500 text-[10px]">
                                            {isTransfer 
                                                ? `→ ${expense.involved[0] ? getUserName(expense.involved[0]) : 'Tothom'}`
                                                : (expense.splitType === 'equal' ? `${expense.involved.length} pers.` : (expense.splitType === 'exact' ? 'Exacte' : 'Parts'))
                                            }
                                        </span>
                                    </div>
                                </div>
                                </div>

                                {/* AMOUNT */}
                                <div className="flex flex-col items-end pl-2 pt-0.5">
                                <span className={`font-black text-lg tracking-tight whitespace-nowrap tabular-nums ${isTransfer ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                                    {formatCurrency(expense.amount, currency)}
                                </span>
                                {expense.originalCurrency && expense.originalCurrency !== currency.code && (
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 px-1.5 py-0.5 rounded-md whitespace-nowrap mt-1 tabular-nums">
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
          <div ref={observerTarget} className="h-20 flex items-center justify-center w-full">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300 dark:text-slate-700" />
          </div>
        )}
      </div>
    </div>
  );
}