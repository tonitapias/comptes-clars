// src/components/trip/ExpensesList.tsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Search, Receipt, ArrowRightLeft, Paperclip, Loader2 } from 'lucide-react'; 
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
}

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300', 
    'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300', 
    'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300', 
    'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300',
    'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
    'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-300',
    'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300',
    'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const PAGE_SIZE = 20;

export default function ExpensesList({ 
  expenses, 
  searchQuery, 
  setSearchQuery, 
  filterCategory, 
  setFilterCategory,
  onEdit
}: ExpensesListProps) {
  const { tripData } = useTrip();
  
  // ESTAT: Control de paginació local
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Optimització: Mapa d'usuaris O(1)
  const userMap = useMemo(() => {
    if (!tripData?.users) return {};
    return tripData.users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, TripUser>);
  }, [tripData?.users]);

  // RESET: Quan canvien els filtres, tornem a l'inici de la llista
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, filterCategory, expenses]); // Afegim expenses per si s'afegeix una de nova

  // LOGICA: Infinite Scroll amb IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + PAGE_SIZE);
        }
      },
      { threshold: 0.1, rootMargin: '100px' } // Carrega abans d'arribar al final
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [expenses.length]); // Recreem només si la longitud canvia (pocs renders)

  const getUserName = (id: string) => userMap[id]?.name || 'Desconegut';

  // SLICE: Només renderitzem el subconjunt visible
  const visibleExpenses = expenses.slice(0, visibleCount);
  const hasMore = visibleCount < expenses.length;

  if (!tripData) return null;
  const { currency } = tripData;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Cerca despeses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-600 transition-all text-slate-800 dark:text-slate-100"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {CATEGORIES.map(cat => (
                <button
                    key={cat.id}
                    onClick={() => setFilterCategory(cat.id)}
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm font-medium
                        ${filterCategory === cat.id 
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg scale-105' 
                            : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}
                    `}
                >
                    <cat.icon className="w-4 h-4" />
                    {cat.label}
                </button>
            ))}
        </div>
      </div>

      {/* Expenses List */}
      <div className="space-y-4">
        {expenses.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No s'han trobat despeses</p>
            </div>
        ) : (
            <>
              {visibleExpenses.map((expense) => {
                  const category = CATEGORIES.find(c => c.id === expense.category) || CATEGORIES[0];
                  const isTransfer = expense.category === 'transfer';
                  const payerName = getUserName(expense.payer);
                  const hasForeignCurrency = expense.originalCurrency && expense.originalCurrency !== currency.code;

                  return (
                    <div 
                      key={expense.id}
                      onClick={() => onEdit(expense)}
                      className="group bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer relative overflow-hidden"
                    >
                      {/* Category Color Bar */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${category.barColor}`} />

                      <div className="flex items-center justify-between pl-3">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={`
                              w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors
                              ${isTransfer ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'}
                          `}>
                              {isTransfer ? <ArrowRightLeft className="w-6 h-6" /> : <category.icon className="w-6 h-6" />}
                          </div>
                          
                          <div className="flex flex-col min-w-0 flex-1 mr-2">
                              <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-bold text-slate-800 dark:text-slate-100 truncate text-base">{expense.title}</span>
                                  {expense.receiptUrl && <Paperclip className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                              </div>
                              
                              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                  <span>{formatDateDisplay(expense.date)}</span>
                                  <span>•</span>
                                  <div className="flex items-center gap-1.5 min-w-0">
                                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${getAvatarColor(payerName)}`}>
                                          {userMap[expense.payer]?.photoUrl ? (
                                              <img src={userMap[expense.payer].photoUrl} alt={payerName} className="w-full h-full object-cover rounded-full" />
                                          ) : payerName.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="font-medium truncate max-w-[80px]">{payerName}</span>
                                  </div>
                                  <span>•</span>
                                  <span className="truncate">
                                      {isTransfer 
                                          ? `→ ${expense.involved[0] ? getUserName(expense.involved[0]) : 'Tothom'}`
                                          : (expense.splitType === 'equal' ? `${expense.involved.length} pers.` : (expense.splitType === 'exact' ? 'Exacte' : 'Parts'))
                                      }
                                  </span>
                              </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end pl-2">
                          <span className={`font-bold text-lg whitespace-nowrap ${isTransfer ? 'text-emerald-500' : 'text-slate-800 dark:text-white'}`}>
                              {formatCurrency(expense.amount, currency)}
                          </span>
                          {hasForeignCurrency && (
                              <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded whitespace-nowrap mt-1">
                                  {expense.originalAmount?.toFixed(2)} {expense.originalCurrency}
                              </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
              })}
              
              {/* TRIGGER per Infinite Scroll */}
              {hasMore && (
                <div ref={observerTarget} className="h-10 flex items-center justify-center w-full">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              )}
            </>
        )}
      </div>
    </div>
  );
}