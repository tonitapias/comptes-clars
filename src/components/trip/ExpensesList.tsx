import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Search, Receipt, ArrowRightLeft, Paperclip, Loader2, CalendarDays, X, SlidersHorizontal } from 'lucide-react'; 
import { CATEGORIES } from '../../utils/constants';
import { Expense, CategoryId, TripUser } from '../../types';
import { formatCurrency, formatDateDisplay } from '../../utils/formatters';
import { useTrip } from '../../context/TripContext';
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

const ExpenseSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 animate-pulse">
    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0" />
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
        if (entries[0].isIntersecting) setVisibleCount((prev) => prev + PAGE_SIZE);
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

  const handleCategoryClick = (catId: CategoryId | 'all') => {
    trigger('light');
    setFilterCategory(catId);
  };

  return (
    <div className="flex flex-col h-full min-h-[60vh] pb-32 relative"> 
      
      <header className="sticky top-0 z-40 -mx-5 px-5 pt-2 pb-4 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 transition-colors shadow-sm">
        <div className="flex flex-col gap-3 max-w-2xl mx-auto">
            
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors pointer-events-none group-focus-within:text-primary">
                    <Search className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <input 
                    type="text"
                    placeholder="Buscar despesa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-10 h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 font-bold text-sm appearance-none"
                />
                {isSearching ? (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                ) : searchQuery && (
                    <button 
                        onClick={() => { trigger('light'); setSearchQuery(''); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors"
                    >
                        <X size={16} strokeWidth={3} />
                    </button>
                )}
            </div>
            
            <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-slate-50 dark:from-slate-950 to-transparent pointer-events-none z-10" />
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-50 dark:from-slate-950 to-transparent pointer-events-none z-10" />

                <div className="flex gap-2 overflow-x-auto px-1 pb-1 pt-0.5 hide-scrollbar snap-x relative z-0">
                    <button
                        onClick={() => handleCategoryClick('all')}
                        className={`
                            snap-start flex items-center gap-1.5 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all text-xs font-black border select-none active:scale-95
                            ${filterCategory === 'all'
                                ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-950 shadow-md' 
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}
                        `}
                    >
                        <SlidersHorizontal size={14} strokeWidth={2.5} /> Tots
                    </button>
                    
                    {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                        const isActive = filterCategory === cat.id;
                        const colorBase = cat.color.split('-')[1]; // 'emerald', 'blue'...
                        
                        return (
                            <button
                                key={cat.id}
                                onClick={() => handleCategoryClick(cat.id)}
                                className={`
                                    snap-start flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all text-xs font-bold border select-none active:scale-95
                                    ${isActive 
                                        ? `bg-${colorBase}-500 text-white border-${colorBase}-500 shadow-md shadow-${colorBase}-500/20` 
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}
                                `}
                            >
                                <cat.icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                                {cat.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 pt-4 px-1">
        {isSearching && expenses.length === 0 ? (
           <div className="space-y-4">
             {Array.from({ length: 4 }).map((_, i) => <ExpenseSkeleton key={i} />)}
           </div>
        ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 mb-6 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-5 bg-[url('/noise.svg')] bg-repeat" />
                    <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">
                    {searchQuery ? "Sense resultats" : "Tot tranquil per aquí"}
                </h3>
                <p className="text-sm text-slate-500 mt-2 max-w-[220px] mx-auto leading-relaxed">
                    {searchQuery 
                        ? "Prova amb altres paraules o esborra els filtres." 
                        : "Afegeix la primera despesa per començar a dividir comptes."}
                </p>
                {searchQuery && (
                    <button 
                        onClick={() => setSearchQuery('')}
                        className="mt-6 text-primary font-bold text-sm hover:underline"
                    >
                        Esborrar cerca
                    </button>
                )}
            </div>
        ) : (
            <ul className="relative space-y-1">
              {visibleExpenses.map((expense, index) => {
                  const category = CATEGORIES.find(c => c.id === expense.category) || CATEGORIES[0];
                  const isTransfer = expense.category === 'transfer';
                  const payerName = getUserName(expense.payer);
                  const colorBase = category.color.split('-')[1];

                  const showDateHeader = index === 0 || expense.date !== visibleExpenses[index - 1].date;
                  const displayDate = formatDateDisplay(expense.date); 
                  const isToday = displayDate.toLowerCase().includes('avui') || displayDate.toLowerCase().includes('today');

                  return (
                    <React.Fragment key={expense.id}>
                        {showDateHeader && (
                            <li className="sticky top-32 z-30 flex justify-center pointer-events-none py-4">
                                <div className={`
                                    flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] uppercase tracking-widest font-black shadow-sm border backdrop-blur-md transition-all
                                    ${isToday 
                                        ? 'bg-indigo-600/90 text-white border-indigo-500/50 shadow-indigo-500/20' 
                                        : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 border-white/50 dark:border-slate-700/50'}
                                `}>
                                    <CalendarDays size={11} strokeWidth={2.5} />
                                    {displayDate}
                                </div>
                            </li>
                        )}

                        <li className="px-1">
                            <button 
                                type="button"
                                onClick={() => { trigger('light'); onEdit(expense); }}
                                className="group w-full text-left bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all hover:border-primary/30 dark:hover:border-primary/30 active:scale-[0.99] shadow-sm hover:shadow-md relative overflow-hidden"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`
                                        w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-sm
                                        ${isTransfer 
                                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' 
                                            : `bg-${colorBase}-50 text-${colorBase}-600 dark:bg-${colorBase}-900/20 dark:text-${colorBase}-400`
                                        }
                                    `}>
                                        {isTransfer ? <ArrowRightLeft size={20} strokeWidth={2.5} /> : <category.icon size={20} strokeWidth={2.5} />}
                                    </div>
                                    
                                    <div className="flex flex-col min-w-0 flex-1 gap-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-base text-slate-800 dark:text-slate-100 truncate pr-2">
                                                {expense.title}
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                                                <span className="font-bold text-slate-600 dark:text-slate-300">{payerName}</span>
                                            </div>
                                            <span className="text-slate-300 dark:text-slate-700">•</span>
                                            <span className="truncate opacity-80">
                                                {isTransfer 
                                                    ? `➜ ${expense.involved[0] ? getUserName(expense.involved[0]) : '...'}`
                                                    : (expense.splitType === 'equal' ? `${expense.involved.length} pers.` : 'Manual')
                                                }
                                            </span>
                                            {expense.receiptUrl && <Paperclip size={10} className="text-indigo-500 ml-1" />}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end pl-2">
                                        <span className={`block font-black text-lg tracking-tight tabular-nums ${isTransfer ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
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
        
        {hasMore && !isSearching && (
          <div ref={observerTarget} className="h-24 flex items-center justify-center w-full text-slate-300 pt-4">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
}