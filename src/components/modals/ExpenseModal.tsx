import React, { useState, useEffect } from 'react';
import { X, Calendar, User as UserIcon, CheckSquare, Square, AlertCircle, Calculator, PieChart, Users, Lock } from 'lucide-react';
import Modal from '../Modal';
import Button from '../Button';
import { CATEGORIES } from '../../utils/constants';
import { TripService } from '../../services/tripService';
import { TripUser, Currency, Expense, SplitType } from '../../types';
import { ToastType } from '../Toast';

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

export default function ExpenseModal({ isOpen, onClose, initialData, users, currency, tripId, onDelete, showToast }: ExpenseModalProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [involved, setInvolved] = useState<string[]>([]);
  const [splitDetails, setSplitDetails] = useState<Record<string, number>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        // CONVERSIÓ CÈNTIMS -> UNITATS PER EDITAR
        setAmount((initialData.amount / 100).toFixed(2));
        setPayer(initialData.payer);
        setCategory(initialData.category);
        setDate(initialData.date.split('T')[0]);
        setSplitType(initialData.splitType || 'equal');
        setInvolved(initialData.involved || []);

        // Si el repartiment és exacte, els detalls també venen en cèntims
        const details = initialData.splitDetails || {};
        if (initialData.splitType === 'exact') {
            const unitsDetails: Record<string, number> = {};
            Object.entries(details).forEach(([uid, val]) => {
                unitsDetails[uid] = val / 100;
            });
            setSplitDetails(unitsDetails);
        } else {
            setSplitDetails(details);
        }

      } else {
        setTitle('');
        setAmount('');
        const firstValidUser = users.find(u => !u.isDeleted);
        setPayer(firstValidUser ? firstValidUser.id : '');
        setCategory('food');
        setInvolved(users.filter(u => !u.isDeleted).map(u => u.id));
        setDate(new Date().toISOString().split('T')[0]);
        setSplitType('equal');
        setSplitDetails({});
      }
    }
  }, [isOpen, initialData, users]);

  // Validació
  const currentTotalDetails = Object.values(splitDetails).reduce((a, b) => a + b, 0);
  const amountNum = parseFloat(amount) || 0;
  const isExactMismatch = splitType === 'exact' && Math.abs(amountNum - currentTotalDetails) > 0.05;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !payer) return;

    if (splitType === 'equal' && involved.length === 0) {
        showToast("Selecciona almenys una persona", 'error');
        return;
    }
    
    let finalInvolved = involved;
    if (splitType !== 'equal') {
        finalInvolved = Object.entries(splitDetails)
            .filter(([_, val]) => val > 0)
            .map(([id]) => id);
            
        if (finalInvolved.length === 0) {
            showToast("Assigna imports o parts a algú", 'error');
            return;
        }
    }

    // Auto-fix per arrodoniment
    if (splitType === 'exact' && Math.abs(amountNum - currentTotalDetails) > 0.05) {
         setAmount(currentTotalDetails.toFixed(2));
    }

    setIsSubmitting(true);
    try {
      // PREPARAR DADES PER GUARDAR (CÈNTIMS)
      const finalAmountCents = Math.round(parseFloat(amount) * 100);
      
      let finalDetails = splitDetails;
      if (splitType === 'exact') {
          // Convertim els detalls a cèntims també
          finalDetails = {};
          Object.entries(splitDetails).forEach(([uid, val]) => {
              finalDetails[uid] = Math.round(val * 100);
          });
      } else if (splitType === 'equal') {
          finalDetails = {};
      }

      const expenseData = {
        title: title.trim(),
        amount: finalAmountCents, // Guardem CÈNTIMS
        payer,
        category,
        involved: finalInvolved,
        date: new Date(date).toISOString(),
        splitType,
        splitDetails: finalDetails
      };

      if (initialData) {
        await TripService.updateExpense(tripId, String(initialData.id), expenseData);
        showToast("Despesa actualitzada!");
      } else {
        await TripService.addExpense(tripId, expenseData);
        showToast("Despesa afegida!");
      }
      onClose();
    } catch (error: any) {
      console.error(error);
      const msg = error.issues ? error.issues[0].message : error.message;
      showToast(msg || "Error al guardar", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleInvolved = (userId: string) => {
    setInvolved(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleDetailChange = (userId: string, value: string) => {
      const numVal = value === '' ? 0 : parseFloat(value);
      const newDetails = { ...splitDetails, [userId]: isNaN(numVal) ? 0 : numVal };
      setSplitDetails(newDetails);

      if (splitType === 'exact') {
          const newTotal = Object.values(newDetails).reduce((a, b) => a + b, 0);
          setAmount(newTotal.toFixed(2));
      }
  };

  const handleSelectAll = () => setInvolved(users.filter(u => !u.isDeleted).map(u => u.id));
  const handleSelectNone = () => setInvolved([]);
  const handleSelectOnlyPayer = () => { if (payer) setInvolved([payer]); };

  const activeUsers = users.filter(u => !u.isDeleted);
  const isAutoSumMode = splitType === 'exact';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Despesa' : 'Nova Despesa'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Import i Títol */}
        <div className="flex gap-3">
            <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Concepte</label>
                <input required type="text" placeholder="Ex: Sopar..." className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 ring-indigo-500/20 transition-all" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="w-1/3">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-1">
                    Import {isAutoSumMode && <Lock size={10} className="text-indigo-500"/>}
                </label>
                <div className="relative">
                    <input 
                        required 
                        type="number" 
                        step="0.01" 
                        min="0.01" 
                        placeholder="0.00" 
                        readOnly={isAutoSumMode}
                        className={`w-full p-3 pl-8 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl outline-none transition-all font-mono font-bold
                        ${isAutoSumMode 
                            ? 'bg-slate-100 dark:bg-slate-900 text-slate-500 cursor-not-allowed border-indigo-200 dark:border-indigo-900/50' 
                            : 'bg-slate-50 dark:bg-slate-800 focus:ring-2 ring-indigo-500/20'}`} 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)} 
                    />
                    <span className="absolute left-3 top-3.5 text-slate-400 text-sm font-bold">{currency.symbol}</span>
                </div>
            </div>
        </div>

        {/* Pagador i Data */}
        <div className="grid grid-cols-2 gap-3">
             <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Pagat per</label>
                <div className="relative">
                    <select className="w-full p-3 pl-9 appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 ring-indigo-500/20 transition-all text-sm font-medium" value={payer} onChange={e => setPayer(e.target.value)}>
                        {activeUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <UserIcon className="absolute left-3 top-3.5 text-slate-400" size={16}/>
                </div>
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Data</label>
                <div className="relative">
                    <input type="date" className="w-full p-3 pl-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 ring-indigo-500/20 transition-all text-sm font-medium" value={date} onChange={e => setDate(e.target.value)} />
                    <Calendar className="absolute left-3 top-3.5 text-slate-400" size={16}/>
                </div>
             </div>
        </div>

        {/* Categories */}
        <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Categoria</label>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {CATEGORIES.filter(c => c.id !== 'all' && c.id !== 'transfer').map(cat => (
                    <button type="button" key={cat.id} onClick={() => setCategory(cat.id)} 
                    className={`flex flex-col items-center gap-1 min-w-[60px] p-2 rounded-xl border-2 transition-all ${category === cat.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 scale-105' : 'border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 grayscale'}`}>
                        <cat.icon size={20} />
                        <span className="text-[10px] font-bold">{cat.label}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* REPARTIMENT */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Com es reparteix?</label>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    {(['equal', 'exact', 'shares'] as const).map((type) => (
                        <button key={type} type="button" onClick={() => setSplitType(type)} className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${splitType === type ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                            {type === 'equal' && <Users size={12}/>}
                            {type === 'exact' && <Calculator size={12}/>}
                            {type === 'shares' && <PieChart size={12}/>}
                            {type === 'equal' ? 'Igual' : type === 'exact' ? 'Exacte' : 'Parts'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Contingut Repartiment (Igual que abans, però la lògica d'estat ja gestiona unitats vs cèntims al Submit) */}
            {splitType === 'equal' && (
                <div className="animate-fade-in">
                     <div className="flex justify-end gap-1 mb-2">
                        <button type="button" onClick={handleSelectAll} className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200">Tots</button>
                        <button type="button" onClick={handleSelectNone} className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200">Ningú</button>
                        <button type="button" onClick={handleSelectOnlyPayer} className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded hover:bg-indigo-100">Només Pagador</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                        {activeUsers.map(u => {
                            const isSelected = involved.includes(u.id);
                            return (
                                <button type="button" key={u.id} onClick={() => toggleInvolved(u.id)} className={`flex items-center gap-2 p-2 rounded-lg border text-sm font-medium transition-all text-left ${isSelected ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 opacity-70 hover:opacity-100'}`}>
                                    {isSelected ? <CheckSquare size={16} className="shrink-0"/> : <Square size={16} className="shrink-0"/>}
                                    <span className="truncate">{u.name}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {splitType === 'exact' && (
                <div className="animate-fade-in space-y-2">
                    <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold mb-2 flex items-center gap-1"><Calculator size={10}/> El total es calcula automàticament.</p>
                    {activeUsers.map(u => (
                         <div key={u.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                             <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate w-32">{u.name}</span>
                             <div className="relative w-32">
                                <input type="number" step="0.01" min="0" placeholder="0.00" value={splitDetails[u.id] || ''} onChange={(e) => handleDetailChange(u.id, e.target.value)} className="w-full p-1.5 pl-6 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-md text-sm font-bold outline-none focus:border-indigo-500"/>
                                <span className="absolute left-2 top-1.5 text-slate-400 text-xs">{currency.symbol}</span>
                             </div>
                         </div>
                    ))}
                </div>
            )}

            {splitType === 'shares' && (
                <div className="animate-fade-in space-y-2">
                     <p className="text-[10px] text-slate-400 mb-2">Assigna "parts" (ex: 1 per defecte, 2 si compta doble...)</p>
                     <div className="grid grid-cols-2 gap-2">
                        {activeUsers.map(u => (
                            <div key={u.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{u.name}</span>
                                <input type="number" step="0.5" min="0" placeholder="0" value={splitDetails[u.id] ?? ''} onChange={(e) => handleDetailChange(u.id, e.target.value)} className="w-16 p-1.5 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-md text-sm font-bold outline-none focus:border-indigo-500"/>
                            </div>
                        ))}
                     </div>
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