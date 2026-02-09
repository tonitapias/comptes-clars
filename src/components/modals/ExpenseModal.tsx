import React from 'react';
import { X, Calendar, User as UserIcon, CheckSquare, Square, Calculator, PieChart, Users, Lock, Link, Globe, RefreshCcw } from 'lucide-react';
import Modal from '../Modal';
import Button from '../Button';
import { CATEGORIES } from '../../utils/constants';
import { TripUser, Currency, Expense, CurrencyCode } from '../../types';
import { ToastType } from '../Toast';
import { useExpenseForm } from '../../hooks/useExpenseForm'; // <--- El nostre nou hook
import { useTrip } from '../../context/TripContext'; // <--- Accés directe a accions

const AVAILABLE_CURRENCIES: CurrencyCode[] = ['EUR', 'USD', 'GBP', 'JPY', 'MXN'];

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Expense | null;
  users: TripUser[];
  currency: Currency;
  tripId: string;
  onDelete?: (id: string | number) => void;
  showToast: (msg: string, type?: ToastType) => void;
}

export default function ExpenseModal({ isOpen, onClose, initialData, users, currency, onDelete, showToast }: ExpenseModalProps) {
  const { actions } = useTrip(); // Utilitzem les accions del context

  // Deleguem tota la lògica al Hook
  const { formState, setters, logic, isSubmitting } = useExpenseForm({
    initialData: initialData || null,
    users,
    currency,
    onSubmit: async (data) => {
      try {
        if (initialData) {
          const res = await actions.updateExpense(String(initialData.id), data);
          if (!res.success) throw new Error(res.error);
          showToast("Despesa actualitzada!");
        } else {
          const res = await actions.addExpense(data);
          if (!res.success) throw new Error(res.error);
          showToast("Despesa afegida!");
        }
        onClose();
      } catch (error: any) {
        showToast(error.message || "Error al guardar", 'error');
      }
    }
  });

  const { title, amount, payer, category, date, receiptUrl, splitType, involved, splitDetails, isForeignCurrency, foreignAmount, foreignCurrency, exchangeRate } = formState;
  
  const activeUsers = users.filter(u => !u.isDeleted);
  const isAutoSumMode = splitType === 'exact' || isForeignCurrency;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Despesa' : 'Nova Despesa'}>
      <form onSubmit={logic.handleSubmit} className="space-y-5">
        
        {/* Toggle Multi-divisa */}
        <div className="flex justify-end">
            <button type="button" onClick={() => setters.setIsForeignCurrency(!isForeignCurrency)}
                className={`text-xs font-bold flex items-center gap-1 px-3 py-1.5 rounded-full transition-all ${isForeignCurrency ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                <Globe size={12}/> {isForeignCurrency ? 'Moneda Estrangera Activa' : 'Canviar Divisa?'}
            </button>
        </div>

        {/* INPUTS DE DIVISA ESTRANGERA */}
        {isForeignCurrency && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-in">
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Import Original</label>
                        <div className="flex gap-2">
                             <select value={foreignCurrency} onChange={(e) => setters.setForeignCurrency(e.target.value as CurrencyCode)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold p-2 outline-none">
                                 {AVAILABLE_CURRENCIES.filter(c => c !== currency.code).map(c => <option key={c} value={c}>{c}</option>)}
                             </select>
                             <input type="number" step="0.01" min="0.01" placeholder="0.00" className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-bold"
                                value={foreignAmount} onChange={(e) => setters.setForeignAmount(e.target.value)} autoFocus />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-1"><RefreshCcw size={10}/> Tipus de Canvi</label>
                        <div className="relative">
                            <input type="number" step="0.0001" min="0.0001" placeholder="1.00" className="w-full p-2 pl-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-bold"
                                value={exchangeRate} onChange={(e) => setters.setExchangeRate(e.target.value)} />
                            <span className="absolute right-2 top-2.5 text-[10px] text-slate-400">1 {foreignCurrency} = {exchangeRate} {currency.code}</span>
                        </div>
                    </div>
                </div>
                <div className="text-right"><p className="text-xs text-slate-400">Total calculat: <span className="font-bold text-indigo-600 dark:text-indigo-400">{amount || '0.00'} {currency.symbol}</span></p></div>
            </div>
        )}

        {/* Import i Títol */}
        <div className="flex gap-3">
            <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Concepte</label>
                <input required type="text" placeholder="Ex: Sopar..." className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 ring-indigo-500/20 transition-all" value={title} onChange={e => setters.setTitle(e.target.value)} />
            </div>
            <div className="w-1/3">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-1">Total ({currency.code}) {isAutoSumMode && <Lock size={10} className="text-indigo-500"/>}</label>
                <div className="relative">
                    <input required type="number" step="0.01" min="0.01" placeholder="0.00" readOnly={isAutoSumMode} 
                        className={`w-full p-3 pl-8 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl outline-none transition-all font-mono font-bold ${isAutoSumMode ? 'bg-slate-100 dark:bg-slate-900 text-slate-500 cursor-not-allowed border-indigo-200' : 'bg-slate-50 dark:bg-slate-800 focus:ring-2 ring-indigo-500/20'}`} 
                        value={amount} onChange={e => setters.setAmount(e.target.value)} />
                    <span className="absolute left-3 top-3.5 text-slate-400 text-sm font-bold">{currency.symbol}</span>
                </div>
            </div>
        </div>

        {/* Pagador i Data */}
        <div className="grid grid-cols-2 gap-3">
             <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Pagat per</label>
                <div className="relative">
                    <select className="w-full p-3 pl-9 appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 ring-indigo-500/20 transition-all text-sm font-medium" value={payer} onChange={e => setters.setPayer(e.target.value)}>
                        {activeUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <UserIcon className="absolute left-3 top-3.5 text-slate-400" size={16}/>
                </div>
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Data</label>
                <div className="relative">
                    <input type="date" className="w-full p-3 pl-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 ring-indigo-500/20 transition-all text-sm font-medium" value={date} onChange={e => setters.setDate(e.target.value)} />
                    <Calendar className="absolute left-3 top-3.5 text-slate-400" size={16}/>
                </div>
             </div>
        </div>

        {/* Categories */}
        <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Categoria</label>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {CATEGORIES.filter(c => c.id !== 'all' && c.id !== 'transfer').map(cat => (
                    <button type="button" key={cat.id} onClick={() => setters.setCategory(cat.id)} 
                    className={`flex flex-col items-center gap-1 min-w-[60px] p-2 rounded-xl border-2 transition-all ${category === cat.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 scale-105' : 'border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 grayscale'}`}>
                        <cat.icon size={20} />
                        <span className="text-[10px] font-bold">{cat.label}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* INPUT DE TIQUET */}
        <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-1"><Link size={12}/> Enllaç del Tiquet / Foto</label>
            <input type="url" placeholder="https://..." className="w-full p-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 ring-indigo-500/20 transition-all placeholder:text-slate-400" value={receiptUrl} onChange={e => setters.setReceiptUrl(e.target.value)} />
        </div>

        {/* REPARTIMENT */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Com es reparteix?</label>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    {(['equal', 'exact', 'shares'] as const).map((type) => (
                        <button key={type} type="button" onClick={() => setters.setSplitType(type)} className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${splitType === type ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                            {type === 'equal' && <Users size={12}/>}{type === 'exact' && <Calculator size={12}/>}{type === 'shares' && <PieChart size={12}/>}
                            {type === 'equal' ? 'Igual' : type === 'exact' ? 'Exacte' : 'Parts'}
                        </button>
                    ))}
                </div>
            </div>

            {splitType === 'equal' && (
                <div className="animate-fade-in">
                     <div className="flex justify-end gap-1 mb-2">
                        <button type="button" onClick={logic.handleSelectAll} className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200">Tots</button>
                        <button type="button" onClick={logic.handleSelectNone} className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200">Ningú</button>
                        <button type="button" onClick={logic.handleSelectOnlyPayer} className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded hover:bg-indigo-100">Només Pagador</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                        {activeUsers.map(u => {
                            const isSelected = involved.includes(u.id);
                            return (
                                <button type="button" key={u.id} onClick={() => logic.toggleInvolved(u.id)} className={`flex items-center gap-2 p-2 rounded-lg border text-sm font-medium transition-all text-left ${isSelected ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 opacity-70 hover:opacity-100'}`}>
                                    {isSelected ? <CheckSquare size={16} className="shrink-0"/> : <Square size={16} className="shrink-0"/>}
                                    <span className="truncate">{u.name}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {(splitType === 'exact' || splitType === 'shares') && (
                <div className="animate-fade-in space-y-2">
                    {splitType === 'exact' && <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold mb-2 flex items-center gap-1"><Calculator size={10}/> El total es calcula automàticament.</p>}
                    {activeUsers.map(u => (
                         <div key={u.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                             <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate w-32">{u.name}</span>
                             {splitType === 'exact' ? (
                                <div className="relative w-32">
                                    <input type="number" step="0.01" min="0" placeholder="0.00" value={splitDetails[u.id] || ''} onChange={(e) => logic.handleDetailChange(u.id, e.target.value)} className="w-full p-1.5 pl-6 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-md text-sm font-bold outline-none focus:border-indigo-500"/>
                                    <span className="absolute left-2 top-1.5 text-slate-400 text-xs">{currency.symbol}</span>
                                </div>
                             ) : (
                                <input type="number" step="0.5" min="0" placeholder="0" value={splitDetails[u.id] ?? ''} onChange={(e) => logic.handleDetailChange(u.id, e.target.value)} className="w-16 p-1.5 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-md text-sm font-bold outline-none focus:border-indigo-500"/>
                             )}
                         </div>
                    ))}
                </div>
            )}
        </div>

        <div className="flex gap-3 pt-2">
            {initialData && onDelete && <button type="button" onClick={() => onDelete(initialData.id)} className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"><X size={20} /></button>}
            <Button type="submit" className="flex-1" disabled={isSubmitting || (splitType === 'equal' && involved.length === 0)}>{isSubmitting ? 'Guardant...' : initialData ? 'Actualitzar' : 'Afegir Despesa'}</Button>
        </div>
      </form>
    </Modal>
  );
}