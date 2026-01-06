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
  onEdit: (e: Expense | null) => void;
  currency: Currency;
  users: TripUser[];
}

// Helper per generar colors consistents basats en el nom
// Això assigna sempre el mateix color a la mateixa persona (ex: Toni -> Blau)
const getAvatarColor = (name: string) => {
  const colors = [
    'bg-red-100 text-red-600', 
    'bg-blue-100 text-blue-600', 
    'bg-green-100 text-green-600', 
    'bg-yellow-100 text-yellow-600', 
    'bg-purple-100 text-purple-600', 
    'bg-pink-100 text-pink-600',
    'bg-indigo-100 text-indigo-600',
    'bg-orange-100 text-orange-600',
    'bg-teal-100 text-teal-600',
    'bg-cyan-100 text-cyan-600'
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
                
                const payerName = getUserName(expense.payer);
                const photoUrl = getUserPhoto(expense.payer);
                
                // Determinem el color de l'avatar:
                // Si té foto, posem bg-white (neutre). Si no, calculem color.
                const avatarClass = photoUrl ? 'bg-white' : getAvatarColor(payerName);
                
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
                        
                        {/* SECCIÓ QUI PAGA I DETALLS */}
                        <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex items-center gap-1.5 bg-slate-50 pl-1 pr-2 py-0.5 rounded-full border border-slate-100">
                                {/* AVATAR DINÀMIC */}
                                <div className={`w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-[9px] font-bold border border-white shadow-sm ${avatarClass}`}>
                                    {photoUrl ? (
                                        <img src={photoUrl} className="w-full h-full object-cover" alt={payerName}/>
                                    ) : (
                                        // Si no té foto, mostrem la inicial en majúscula sobre el color
                                        payerName.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <span className="text-xs text-slate-600 font-bold">{payerName}</span>
                            </div>
                            
                            <span className="text-xs text-slate-400">•</span>

                            <span className="text-xs text-slate-500 truncate">
                                {isTransfer ? '→' : 'Per a'} 
                                <span className="ml-1 font-medium">
                                {isTransfer 
                                    ? (expense.involved[0] ? getUserName(expense.involved[0]) : 'Tothom') 
                                    : (expense.splitType === 'equal' ? `${expense.involved.length} pers.` : (expense.splitType === 'exact' ? 'Exacte' : 'Parts'))}
                                </span>
                            </span>
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