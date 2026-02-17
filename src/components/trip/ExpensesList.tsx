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

// Ajustem l'offset perquè els encapçalaments de data es quedin enganxats 
// just sota la barra de cerca (aprox 140px/9rem depenent del dispositiu)
const DATE_HEADER_OFFSET = "top-[8.5rem]";

const ExpenseSkeleton = () => (
  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-4 animate-pulse shadow-sm">
    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex-shrink-0" />
    <div className="flex-1 space-y-2.5">
       <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full w-2/3" />
       <div className="h-3 bg-slate-50 dark:bg-slate-700/50 rounded-full w-1/3" />
    </div>
    <div className="w-16 h-6 bg-slate-100 dark:bg-slate-700 rounded-full" />
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

  // Optimització: Creem el mapa d'usuaris una sola vegada
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
    <div className="space-y-4 animate-fade-in pb-32 min-h-[60vh]"> 
      
      {/* --- STICKY HEADER: SEARCH & FILTERS --- */}
      <header 
        className="sticky top-0 z-40 -mx-4 px-4 pt-2 pb-4 transition-all duration-300"
      >
        {/* Fons Glassmorphism millorat per a llegibilitat */}
        <div className="absolute inset-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm z-0" />
        
        <div className="relative z-10 flex flex-col gap-3">
            
            {/* 1. Search Bar */}
            <div className="relative group">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors pointer-events-none">
                    <Search className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <input 
                    type="text"
                    placeholder="Buscar despesa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-12 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 font-medium text-base appearance-none"
                />
                
                {isSearching ? (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                ) : searchQuery && (
                    <button 
                        onClick={handleClearSearch}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 transition-colors"
                    >
                        <X size={18} strokeWidth={3} />
                    </button>
                )}
            </div>
            
            {/* 2. Category Filters (Scrollable) */}
            <div className="relative -mx-4 px-4">
                <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar snap-x px-4">
                    <button
                        onClick={() => handleCategoryClick('all')}
                        className={`
                            snap-start flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap transition-all text-xs font-bold border select-none
                            ${filterCategory === 'all'
                                ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900 shadow-md transform scale-105' 
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'}
                        `}
                    >
                        <Filter size={14} strokeWidth={2.5} /> Tots
                    </button>
                    
                    {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => handleCategoryClick(cat.id)}
                            className={`
                                snap-start flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-xs font-bold border select-none
                                ${filterCategory === cat.id 
                                    ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 transform scale-105' 
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'}
                            `}
                        >
                            <cat.icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </header>

      {/* --- LISTA DE DESPESES --- */}
      <main className="space-y-3 px-1">
        {isSearching ? (
           <div className="space-y-4 pt-2">
             {Array.from({ length: 4 }).map((_, i) => <ExpenseSkeleton key={i} />)}
           </div>
        ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
                <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4">
                    <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                </div>
                <h3 className="font-bold text-lg text-slate-700 dark:text-slate-300">
                    {searchQuery ? 'Cap resultat' : 'Encara no hi ha despeses'}
                </h3>
                <p className="text-sm text-slate-500 mt-1 max-w-[250px] mx-auto">
                    {searchQuery 
                      ? "Prova amb un altre terme o categoria." 
                      : "Prem el botó '+' per afegir la primera despesa del viatge."}
                </p>
            </div>
        ) : (
            <ul className="relative space-y-3">
              {visibleExpenses.map((expense, index) => {
                  const category = CATEGORIES.find(c => c.id === expense.category) || CATEGORIES[0];
                  const isTransfer = expense.category === 'transfer';
                  const payerName = getUserName(expense.payer);
                  const catColorBase = category.color.split('-')[1];

                  // Lògica per agrupar per dates
                  const showDateHeader = index === 0 || expense.date !== visibleExpenses[index - 1].date;
                  const displayDate = formatDateDisplay(expense.date); 
                  const isToday = displayDate.toLowerCase().includes('avui') || displayDate.toLowerCase().includes('today');

                  return (
                    <React.Fragment key={expense.id}>
                        {/* --- DATE HEADER STICKY --- */}
                        {showDateHeader && (
                            <li className={`sticky ${DATE_HEADER_OFFSET} z-30 flex justify-center pointer-events-none py-3`}>
                                <div className={`
                                    flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] uppercase tracking-widest font-black shadow-sm border backdrop-blur-xl
                                    ${isToday 
                                        ? 'bg-primary text-white border-primary/50 shadow-primary/20' 
                                        : 'bg-white/90 dark:bg-slate-800/90 text-slate-500 border-slate-200/50 dark:border-slate-700'}
                                `}>
                                    <CalendarDays size={12} strokeWidth={2.5} />
                                    {displayDate}
                                </div>
                            </li>
                        )}

                        {/* --- TARGETA DESPESA --- */}
                        <li>
                            <button 
                                type="button"
                                onClick={() => handleExpenseClick(expense)}
                                className="group w-full text-left bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-primary/50 transition-all shadow-sm hover:shadow-md active:scale-[0.99] relative overflow-hidden"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    
                                    {/* Icona Categoria */}
                                    <div className={`
                                        w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border transition-transform group-hover:scale-105 duration-300
                                        ${isTransfer 
                                            ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-900/50' 
                                            : `bg-${catColorBase}-50 border-${catColorBase}-100 text-${catColorBase}-600 dark:bg-${catColorBase}-900/20 dark:border-${catColorBase}-900/50`
                                        }
                                    `}>
                                        {isTransfer ? <ArrowRightLeft size={20} strokeWidth={2} /> : <category.icon size={20} strokeWidth={2} />}
                                    </div>
                                    
                                    {/* Informació Central */}
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                                {expense.title}
                                            </span>
                                            {expense.receiptUrl && <Paperclip size={12} className="text-primary flex-shrink-0" />}
                                        </div>
                                        
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                                            <span className="font-semibold text-slate-600 dark:text-slate-400">{payerName}</span>
                                            <span className="text-slate-300">•</span>
                                            <span className="truncate opacity-80">
                                                {isTransfer 
                                                    ? `➜ ${expense.involved[0] ? getUserName(expense.involved[0]) : '...'}`
                                                    : (expense.splitType === 'equal' ? `${expense.involved.length} pers.` : 'Manual')
                                                }
                                            </span>
                                        </div>
                                    </div>

                                    {/* Import */}
                                    <div className="text-right pl-2">
                                        <span className={`block font-black text-lg tracking-tight tabular-nums ${isTransfer ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
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
        
        {/* Loader Final de Scroll Infinit */}
        {hasMore && !isSearching && (
          <div ref={observerTarget} className="h-20 flex items-center justify-center w-full text-slate-300">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
}