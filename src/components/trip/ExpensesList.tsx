import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Search, Receipt, ArrowRightLeft, Paperclip, Loader2, Filter, CalendarDays, X } from 'lucide-react'; 
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
  <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 animate-pulse">
    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex-shrink-0" />
    <div className="flex-1 space-y-2">
       <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4" />
       <div className="h-3 bg-slate-50 dark:bg-slate-800/50 rounded-full w-1/2" />
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

  // Optimització: User Map
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

  // Scroll Infinit
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
      
      {/* --- STICKY HEADER (Search & Filters) --- */}
      {/* Top-0 amb z-index alt i backdrop-blur per a efecte glassmorphism */}
      <header className="sticky top-0 z-30 pt-2 pb-2 -mx-4 px-4 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md transition-all border-b border-transparent">
        <div className="flex flex-col gap-3">
            
            {/* 1. Search Bar */}
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors pointer-events-none group-focus-within:text-primary">
                    <Search className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <input 
                    type="text"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-10 h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 font-bold text-sm appearance-none"
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
            
            {/* 2. Category Filters (Scrollable) */}
            <div className="relative -mx-4">
                <div className="flex gap-2 overflow-x-auto px-4 pb-2 pt-1 hide-scrollbar snap-x">
                    <button
                        onClick={() => handleCategoryClick('all')}
                        className={`
                            snap-start flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap transition-all text-xs font-black border select-none
                            ${filterCategory === 'all'
                                ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-950 shadow-md scale-105' 
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'}
                        `}
                    >
                        <Filter size={12} strokeWidth={3} /> Tots
                    </button>
                    
                    {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => handleCategoryClick(cat.id)}
                            className={`
                                snap-start flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-xs font-bold border select-none
                                ${filterCategory === cat.id 
                                    ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-105' 
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'}
                            `}
                        >
                            <cat.icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                            {cat.label}
                        </button>
                    ))}
                </div>
                {/* Màscara de gradient dret per indicar scroll */}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-50 dark:from-slate-950 to-transparent pointer-events-none" />
            </div>
        </div>
      </header>

      {/* --- CONTENT LIST --- */}
      <main className="space-y-4 pt-2">
        {isSearching && expenses.length === 0 ? (
           <div className="space-y-4 pt-2">
             {Array.from({ length: 3 }).map((_, i) => <ExpenseSkeleton key={i} />)}
           </div>
        ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-3xl mb-4">
                    <Receipt className="w-10 h-10 text-slate-400 dark:text-slate-600" />
                </div>
                <h3 className="font-bold text-lg text-slate-700 dark:text-slate-300">
                    Cap moviment
                </h3>
                <p className="text-sm text-slate-500 mt-2 max-w-[200px] mx-auto leading-relaxed">
                    {searchQuery ? "No trobem res amb aquest filtre." : "Prem el botó + per començar."}
                </p>
            </div>
        ) : (
            <ul className="relative space-y-2">
              {visibleExpenses.map((expense, index) => {
                  const category = CATEGORIES.find(c => c.id === expense.category) || CATEGORIES[0];
                  const isTransfer = expense.category === 'transfer';
                  const payerName = getUserName(expense.payer);
                  const colorBase = category.color.split('-')[1];

                  // Date Grouping Logic
                  const showDateHeader = index === 0 || expense.date !== visibleExpenses[index - 1].date;
                  const displayDate = formatDateDisplay(expense.date); 
                  const isToday = displayDate.toLowerCase().includes('avui') || displayDate.toLowerCase().includes('today');

                  return (
                    <React.Fragment key={expense.id}>
                        {/* --- DATE PILL (Sticky) --- */}
                        {showDateHeader && (
                            <li className="sticky top-[7.5rem] z-20 flex justify-center pointer-events-none py-4">
                                <div className={`
                                    flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-black shadow-sm border backdrop-blur-xl transition-all
                                    ${isToday 
                                        ? 'bg-primary/90 text-white border-primary/20 shadow-primary/20' 
                                        : 'bg-white/80 dark:bg-slate-900/80 text-slate-500 border-slate-200/50 dark:border-slate-800'}
                                `}>
                                    <CalendarDays size={12} strokeWidth={2.5} />
                                    {displayDate}
                                </div>
                            </li>
                        )}

                        {/* --- EXPENSE CARD --- */}
                        <li>
                            <button 
                                type="button"
                                onClick={() => { trigger('light'); onEdit(expense); }}
                                className="group w-full text-left bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 transition-all hover:border-primary/30 active:scale-[0.98] shadow-sm relative overflow-hidden"
                            >
                                <div className="flex items-center gap-4">
                                    
                                    {/* ICON BOX */}
                                    <div className={`
                                        w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors
                                        ${isTransfer 
                                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' 
                                            : `bg-${colorBase}-50 text-${colorBase}-600 dark:bg-${colorBase}-900/20 dark:text-${colorBase}-400`
                                        }
                                    `}>
                                        {isTransfer ? <ArrowRightLeft size={20} strokeWidth={2.5} /> : <category.icon size={20} strokeWidth={2.5} />}
                                    </div>
                                    
                                    {/* INFO */}
                                    <div className="flex flex-col min-w-0 flex-1 gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-base text-slate-800 dark:text-slate-100 truncate">
                                                {expense.title}
                                            </span>
                                            {expense.receiptUrl && <Paperclip size={12} className="text-primary flex-shrink-0" />}
                                        </div>
                                        
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                                            <span className="font-bold text-slate-600 dark:text-slate-400">{payerName}</span>
                                            <span className="text-slate-300 dark:text-slate-700">•</span>
                                            <span className="truncate opacity-80">
                                                {isTransfer 
                                                    ? `➜ ${expense.involved[0] ? getUserName(expense.involved[0]) : '...'}`
                                                    : (expense.splitType === 'equal' ? `${expense.involved.length} pers.` : 'Manual')
                                                }
                                            </span>
                                        </div>
                                    </div>

                                    {/* AMOUNT */}
                                    <div className="text-right pl-2">
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
        
        {/* Loader Final */}
        {hasMore && !isSearching && (
          <div ref={observerTarget} className="h-24 flex items-center justify-center w-full text-slate-300">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
}