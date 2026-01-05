import React from 'react';
import { Search, Receipt, Plus, ArrowRightLeft } from 'lucide-react';
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
  onEdit: (e: Expense | null) => void; // Canviat de onEditExpense a onEdit per consistència
  currency: Currency;
  users: TripUser[]; // Afegit users
}

export default function ExpensesList({ 
  expenses, searchQuery, setSearchQuery, filterCategory, setFilterCategory, onEdit, currency, users 
}: ExpensesListProps) {
  
  const getCategory = (id: string) => CATEGORIES.find(c => c.id === id) || CATEGORIES.find(c => c.id === 'other') || CATEGORIES[0];
  const getUser = (id: string) => users.find(u => u.id === id);

  return (
    <div className="space-y-4 animate-fade-in">
       <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center gap-2 flex-1 min-w-[150px] shadow-sm">
            <Search size={16} className="text-slate-400 ml-1" />
            <input type="text" placeholder="Buscar..." className="w-full bg-transparent outline-none text-sm font-medium text-slate-700" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <select className="bg-white px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 outline-none shadow-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as any)}>
            {CATEGORIES.map(c => (<option key={c.id} value={c.id}>{c.label}</option>))}
        </select>
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
            <Receipt size={32} className="text-indigo-300 mx-auto mb-4" />
            <p className="text-slate-400 text-sm">No hi ha despeses.</p>
            {!searchQuery && filterCategory === 'all' && <Button onClick={() => onEdit(null)} className="mx-auto mt-4" icon={Plus}>Afegir Despesa</Button>}
        </div>
      ) : (
        <div className="space-y-3">
            {expenses.map((expense) => { 
                const category = getCategory(expense.category); 
                const isTransfer = expense.category === 'transfer'; 
                const payer = getUser(expense.payer);
                const payerName = payer ? payer.name : '???';
                
                return (
                  <Card key={expense.id} className={`hover:shadow-md transition-all group ${isTransfer ? 'bg-slate-50' : 'bg-white'}`} onClick={() => onEdit(expense)}>
                    <div className="flex items-center p-4 cursor-pointer">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-4 shadow-sm ${category.color}`}>
                          {isTransfer ? <ArrowRightLeft size={20}/> : <category.icon size={22} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <h4 className={`font-bold truncate ${isTransfer ? 'text-slate-600 italic' : 'text-slate-800'}`}>{expense.title}</h4>
                            <span className="text-xs text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 ml-2 whitespace-nowrap">{formatDateDisplay(expense.date)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            {/* MINI AVATAR */}
                            <div className="w-4 h-4 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-[8px] font-bold text-slate-600">
                                {payer?.photoUrl ? <img src={payer.photoUrl} className="w-full h-full object-cover"/> : payerName.charAt(0)}
                            </div>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{payerName}</span>
                            <span className="text-xs text-slate-500">{isTransfer ? '→' : '•'} {isTransfer ? (expense.involved[0] ? getUser(expense.involved[0])?.name : 'Tothom') : (expense.splitType === 'equal' ? `${expense.involved.length} pers.` : (expense.splitType === 'exact' ? 'Exacte' : 'Parts'))}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end pl-2">
                        <span className={`font-bold text-lg ${isTransfer ? 'text-slate-500' : 'text-slate-800'}`}>{formatCurrency(expense.amount, currency)}</span>
                      </div>
                    </div>
                  </Card>
            );})}
        </div>
      )}
    </div>
  );
}