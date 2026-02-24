// src/components/trip/ExpensesList.tsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Search, Receipt, ArrowRightLeft, Paperclip, Loader2, Calendar, X, SlidersHorizontal, ArrowDownRight } from 'lucide-react'; 
import { CATEGORIES } from '../../utils/constants';
import { Expense, CategoryId, TripUser, Currency } from '../../types';
import { formatCurrency, formatDateDisplay } from '../../utils/formatters';
import { useTripMeta } from '../../context/TripContext'; 
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

// [FASE 1 FIX]: Mapa precalculat estàtic fora del cicle de React
// Evita reserves de memòria i injeccions innecessàries en cada render
const STATIC_CATEGORY_MAP = new Map<CategoryId | string, typeof CATEGORIES[0]>(
  CATEGORIES.map(c => [c.id, c])
);

const ExpenseSkeleton = () => (
  <div className="flex gap-4 p-4 animate-pulse">
    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex-shrink-0" />
    <div className="flex-1 space-y-2 py-1">
       <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
       <div className="h-3 bg-slate-50 dark:bg-slate-900 rounded w-1/4" />
    </div>
  </div>
);

interface MemoizedExpenseItemProps {
  expense: Expense;
  showDateHeader: boolean;
  displayDate: string;
  isToday: boolean;
  payerName: string;
  involvedName: string;
  category: typeof CATEGORIES[0];
  colorBase: string;
  isTransfer: boolean;
  currency: Currency;
  onEdit: (e: Expense | null) => void;
  trigger: (type: string) => void;
}

const MemoizedExpenseItem = React.memo(({
  expense,
  showDateHeader,
  displayDate,
  isToday,
  payerName,
  involvedName,
  category,
  colorBase,
  isTransfer,
  currency,
  onEdit,
  trigger
}: MemoizedExpenseItemProps) => {
  return (
    <React.Fragment>
      {showDateHeader && (
          <li className="sticky top-[130px] z-20 pl-14 py-3">
              <div className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-widest font-bold shadow-sm backdrop-blur-md border transition-all
                  ${isToday 
                      ? 'bg-indigo-50/90 text-indigo-600 border-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-800 shadow-indigo-500/10' 
                      : 'bg-white/90 text-slate-500 border-slate-200 dark:bg-slate-900/90 dark:text-slate-400 dark:border-slate-800'}
              `}>
                  <Calendar size={11} strokeWidth={2.5} />
                  {displayDate}
              </div>
          </li>
      )}

      <li className="group relative pl-3 pr-1">
          <div className={`
              absolute left-[23px] top-7 w-2.5 h-2.5 rounded-full border-[3px] bg-white dark:bg-slate-950 z-10 transition-all duration-300 group-hover:scale-125
              ${isTransfer ? 'border-emerald-400' : `border-slate-300 dark:border-slate-600 group-hover:border-${colorBase}-500`}
          `} />

          <button 
              type="button"
              onClick={() => { trigger('light'); onEdit(expense); }}
              className="w-full text-left pl-11 relative"
          >
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg hover:shadow-slate-200/40 dark:hover:shadow-none transition-all duration-300 active:scale-[0.99] group-hover:border-slate-200 dark:group-hover:border-slate-700 relative overflow-hidden">
                  
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/50 to-transparent dark:via-white/5 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />

                  <div className="flex items-start justify-between gap-3 relative z-10">
                      <div className="flex items-start gap-3 overflow-hidden">
                          <div className={`
                              w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm transition-colors duration-300
                              ${isTransfer 
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' 
                                  : `bg-${colorBase}-50 text-${colorBase}-600 dark:bg-${colorBase}-900/20 dark:text-${colorBase}-400 group-hover:bg-${colorBase}-100 dark:group-hover:bg-${colorBase}-900/30`
                              }
                          `}>
                              {isTransfer ? <ArrowRightLeft size={20} strokeWidth={2} /> : <category.icon size={20} strokeWidth={2} />}
                          </div>
                          
                          <div className="min-w-0 py-0.5">
                              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate leading-tight mb-1 group-hover:text-indigo-500 transition-colors">
                                  {expense.title}
                              </h4>
                              <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
                                  <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide font-bold">{payerName}</span>
                                  {isTransfer && <ArrowDownRight size={10} />}
                                  <span className="truncate max-w-[100px] opacity-80">
                                      {isTransfer 
                                          ? involvedName
                                          : (expense.splitType !== 'equal' ? '• Manual' : '')
                                      }
                                  </span>
                                  {expense.receiptUrl && <Paperclip size={10} className="text-indigo-400" />}
                              </div>
                          </div>
                      </div>

                      <div className="flex flex-col items-end py-1">
                          <span className={`font-black text-lg tracking-tighter tabular-nums ${isTransfer ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                              {formatCurrency(expense.amount, currency)}
                          </span>
                      </div>
                  </div>
              </div>
          </button>
      </li>
    </React.Fragment>
  );
});

export default function ExpensesList({ 
  expenses, 
  searchQuery, 
  setSearchQuery, 
  filterCategory, 
  setFilterCategory,
  onEdit,
  isSearching
}: ExpensesListProps) {
  const { tripData } = useTripMeta(); 
  const { trigger } = useHapticFeedback();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const observerTarget = useRef<HTMLDivElement>(null);

  const usersSignature = JSON.stringify(tripData?.users || []);
  
  const userMap = useMemo(() => {
    if (!tripData?.users) return {};
    return tripData.users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, TripUser>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usersSignature]); 

  const getUserName = useCallback((id: string) => userMap[id]?.name || 'Desconegut', [userMap]);

  const paymentsSignature = JSON.stringify(tripData?.payments || []);

  const mergedExpenses = useMemo(() => {
    const rawPayments = tripData?.payments || [];
    const mappedPayments: Expense[] = rawPayments.map(p => {
        const methodLabel = p.method === 'bizum' ? 'Bizum' : p.method === 'transfer' ? 'Transferència' : p.method === 'card' ? 'Targeta' : 'Efectiu';
        return {
            id: p.id,
            title: `Liquidació (${methodLabel})`,
            amount: p.amount,
            payer: p.from,
            involved: [p.to],
            category: 'transfer',
            date: p.date,
            splitType: 'equal'
        } as unknown as Expense;
    });

    const q = searchQuery.toLowerCase().trim();
    const cat = filterCategory;

    const filteredPayments = mappedPayments.filter(e => {
        if (cat !== 'all' && e.category !== cat) return false;
        if (q) {
            const searchStr = `${e.title} ${getUserName(e.payer)} ${e.involved.map(uid => getUserName(uid)).join(' ')}`.toLowerCase();
            if (!searchStr.includes(q)) return false;
        }
        return true;
    });

    // [FASE 1 FIX]: Substituït new Date().getTime() per comparació directa de Strings ISO. Més ràpid per a arrays llargs.
    return [...expenses, ...filteredPayments].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return String(b.id).localeCompare(String(a.id));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, paymentsSignature, searchQuery, filterCategory, getUserName]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, filterCategory, mergedExpenses]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
            setVisibleCount((prev) => prev + PAGE_SIZE); 
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    );
    
    if (observerTarget.current) observer.observe(observerTarget.current);
    
    return () => observer.disconnect();
  }, [mergedExpenses.length, isSearching]); 

  const visibleExpenses = mergedExpenses.slice(0, visibleCount);
  const hasMore = visibleCount < mergedExpenses.length;

  if (!tripData) return null;
  const { currency } = tripData;

  const handleCategoryClick = (catId: CategoryId | 'all') => {
    trigger('light');
    setFilterCategory(catId);
  };

  return (
    <div className="flex flex-col h-full min-h-[50vh] pb-32 relative"> 
      
      {/* --- FILTER BAR (Glass) --- */}
      <div className="sticky top-0 z-40 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xl pb-3 pt-1 transition-colors border-b border-slate-200/30 dark:border-slate-800/30">
        <div className="px-1 flex flex-col gap-3">
            
            <div className="relative group px-1">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                <input 
                    type="text"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 h-11 bg-white dark:bg-slate-900 border-none rounded-2xl shadow-sm shadow-slate-200/50 dark:shadow-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400 text-sm font-medium transition-all"
                />
                {searchQuery && (
                    <button 
                        onClick={() => { trigger('light'); setSearchQuery(''); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-500 transition-colors"
                    >
                        <X size={14} strokeWidth={3} />
                    </button>
                )}
            </div>
            
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 px-1">
                <button
                    onClick={() => handleCategoryClick('all')}
                    className={`
                        flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap transition-all text-[11px] font-bold select-none border shadow-sm
                        ${filterCategory === 'all'
                            ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-950' 
                            : 'bg-white dark:bg-slate-900 border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}
                    `}
                >
                    <SlidersHorizontal size={12} strokeWidth={2.5} /> Tots
                </button>
                
                {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                    const isActive = filterCategory === cat.id;
                    const colorBase = cat.color.split('-')[1]; 
                    return (
                        <button
                            key={cat.id}
                            onClick={() => handleCategoryClick(cat.id)}
                            className={`
                                flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap transition-all text-[11px] font-bold select-none border shadow-sm
                                ${isActive 
                                    ? `bg-${colorBase}-500 text-white border-${colorBase}-500 shadow-${colorBase}-500/20` 
                                    : 'bg-white dark:bg-slate-900 border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}
                            `}
                        >
                            <cat.icon size={12} strokeWidth={2.5} />
                            {cat.label}
                        </button>
                    );
                })}
            </div>
        </div>
      </div>

      {/* --- TIMELINE LIST --- */}
      <main className="flex-1 pt-4 relative">
        <div className="absolute left-[27px] top-0 bottom-0 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent dark:from-slate-800 dark:via-slate-800 z-0" />

        {isSearching && mergedExpenses.length === 0 ? (
           <div className="space-y-4 pt-4 pl-14 pr-4">
             {Array.from({ length: 3 }).map((_, i) => <ExpenseSkeleton key={i} />)}
           </div>
        ) : mergedExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in pl-0">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800">
                    <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium text-slate-400">
                    {searchQuery ? "No s'ha trobat res." : "Cap despesa encara."}
                </p>
            </div>
        ) : (
            <ul className="space-y-4 relative z-10">
              {visibleExpenses.map((expense, index) => {
                  // [FASE 1 FIX]: Utilitzem el mapa estàtic fora de memòria
                  const category = STATIC_CATEGORY_MAP.get(expense.category) || CATEGORIES[0];
                  const isTransfer = expense.category === 'transfer';
                  const payerName = getUserName(expense.payer);
                  const colorBase = category.color.split('-')[1];

                  const showDateHeader = index === 0 || expense.date !== visibleExpenses[index - 1].date;
                  const displayDate = formatDateDisplay(expense.date); 
                  const isToday = displayDate.toLowerCase().includes('avui') || displayDate.toLowerCase().includes('today');
                  
                  const involvedName = isTransfer && expense.involved[0] ? getUserName(expense.involved[0]) : '';

                  return (
                      <MemoizedExpenseItem 
                          key={expense.id}
                          expense={expense}
                          showDateHeader={showDateHeader}
                          displayDate={displayDate}
                          isToday={isToday}
                          payerName={payerName}
                          involvedName={involvedName}
                          category={category}
                          colorBase={colorBase}
                          isTransfer={isTransfer}
                          currency={currency}
                          onEdit={onEdit}
                          trigger={trigger as (type: string) => void}
                      />
                  );
              })}
            </ul>
        )}
        
        {hasMore && !isSearching && (
          <div ref={observerTarget} className="h-24 flex items-center justify-center w-full pt-4">
             <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        )}
      </main>
    </div>
  );
}