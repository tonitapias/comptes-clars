import React from 'react';
import { Search, Receipt, Plus, ArrowRightLeft, Paperclip } from 'lucide-react';
import Card from '../Card';
import Button from '../Button';
import { CATEGORIES } from '../../utils/constants';
import { Expense, CategoryId, Currency, TripUser } from '../../types';
import { formatCurrency, formatDateDisplay } from '../../utils/formatters';

interface ExpensesListProps {
  expenses: Expense[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterCategory: CategoryId | 'all';
  setFilterCategory: (c: CategoryId | 'all') => void;
  onEdit: (e: Expense | null) => void;
  currency: Currency;
  users: TripUser[];
}

// Helper actualitzat amb classes 'dark:' per als avatars
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
    'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300',
    'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function ExpensesList({ 
  expenses, searchQuery, setSearchQuery, filterCategory, setFilterCategory, onEdit, currency, users 
}: ExpensesListProps) {
  
  const getCategory = (id: string) => CATEGORIES.find(c => c.id === id) || CATEGORIES.find(c => c.id === 'other') || CATEGORIES[0];
  
  const getUserName = (idOrName: string) => {
      const u = users.find(u => u.id === idOrName);
      return u ? u.name : idOrName; 
  };

  const getUserPhoto = (idOrName: string) => {
      const u = users.find(u => u.id === idOrName);
      return u?.photoUrl;
  };

  return (
    <div className="space-y-4 animate-fade-in">
       {/* BARRA DE CERCA I FILTRE */}
       <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2 flex-1 min-w-[150px] shadow-sm transition-colors">
            <Search size={16} className="text-slate-400 ml-1" />
            <input 
                type="text" 
                placeholder="Buscar..." 
                className="w-full bg-transparent outline-none text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
            />
        </div>
        <select 
            className="bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300 outline-none shadow-sm transition-colors" 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value as any)}
        >
            {CATEGORIES.map(c => (<option key={c.id} value={c.id}>{c.label}</option>))}
        </select>
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 transition-colors">
            <Receipt size={32} className="text-indigo-300 dark:text-indigo-400/50 mx-auto mb-4" />
            <p className="text-slate-400 text-sm">No hi ha despeses.</p>
            {!searchQuery && filterCategory === 'all' && <Button onClick={() => onEdit(null)} className="mx-auto mt-4" icon={Plus}>Afegir Despesa</Button>}
        </div>
      ) : (
        <div className="space-y-3">
            {expenses.map((expense) => { 
                const category = getCategory(expense.category); 
                const isTransfer = expense.category === 'transfer'; 
                
                const payerName = getUserName(expense.payer);
                const photoUrl = getUserPhoto(expense.payer);
                const avatarClass = photoUrl ? 'bg-white' : getAvatarColor(payerName);
                
                // --- LÒGICA MULTI-DIVISA ---
                // Mirem si hi ha una moneda original i si és diferent a la del grup
                const hasForeignCurrency = expense.originalCurrency && expense.originalCurrency !== currency.code;

                return (
                  <Card key={expense.id} className={`hover:shadow-md transition-all group ${isTransfer ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-900'}`} onClick={() => onEdit(expense)}>
                    <div className="flex items-center p-4 cursor-pointer">
                      
                      {/* ICONA CATEGORIA */}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-4 shadow-sm ${category.color}`}>
                          {isTransfer ? <ArrowRightLeft size={20}/> : <category.icon size={22} />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            {/* TÍTOL I TIQUET */}
                            <div className="flex items-center gap-2 overflow-hidden">
                                <h4 className={`font-bold truncate ${isTransfer ? 'text-slate-600 dark:text-slate-400 italic' : 'text-slate-800 dark:text-white'}`}>
                                    {expense.title}
                                </h4>
                                
                                {/* Icona de clip si hi ha URL */}
                                {expense.receiptUrl && (
                                    <a 
                                        href={expense.receiptUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()} 
                                        className="p-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded hover:bg-indigo-100 transition-colors shrink-0"
                                        title="Veure tiquet"
                                    >
                                        <Paperclip size={12} strokeWidth={2.5}/>
                                    </a>
                                )}
                            </div>

                            {/* DATA */}
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700 ml-2 whitespace-nowrap transition-colors">
                                {formatDateDisplay(expense.date)}
                            </span>
                        </div>
                        
                        {/* SECCIÓ QUI PAGA I DETALLS */}
                        <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 pl-1 pr-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-700 transition-colors">
                                {/* AVATAR */}
                                <div className={`w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-[9px] font-bold border border-white dark:border-slate-600 shadow-sm ${avatarClass}`}>
                                    {photoUrl ? (
                                        <img src={photoUrl} className="w-full h-full object-cover" alt={payerName} referrerPolicy="no-referrer"/>
                                    ) : (
                                        payerName.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">{payerName}</span>
                            </div>
                            
                            <span className="text-xs text-slate-400 dark:text-slate-600">•</span>

                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {isTransfer ? '→' : 'Per a'} 
                                <span className="ml-1 font-medium text-slate-600 dark:text-slate-300">
                                {isTransfer 
                                    ? (expense.involved[0] ? getUserName(expense.involved[0]) : 'Tothom') 
                                    : (expense.splitType === 'equal' ? `${expense.involved.length} pers.` : (expense.splitType === 'exact' ? 'Exacte' : 'Parts'))}
                                </span>
                            </span>
                        </div>
                      </div>
                      
                      {/* IMPORT */}
                      <div className="flex flex-col items-end pl-2">
                        <span className={`font-bold text-lg ${isTransfer ? 'text-slate-500 dark:text-slate-500' : 'text-slate-800 dark:text-white'}`}>
                            {formatCurrency(expense.amount, currency)}
                        </span>
                        {/* NOU: Mostrar import original si és divisa estrangera */}
                        {hasForeignCurrency && (
                            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {expense.originalAmount?.toFixed(2)} {expense.originalCurrency}
                            </span>
                        )}
                      </div>
                    </div>
                  </Card>
            );})}
        </div>
      )}
    </div>
  );
}