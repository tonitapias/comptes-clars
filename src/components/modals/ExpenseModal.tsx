// src/components/modals/ExpenseModal.tsx
import React, { useMemo } from 'react';
import { X, Calendar, User as UserIcon, CheckSquare, Square, Calculator, PieChart, Users, AlertCircle } from 'lucide-react';
import Modal from '../Modal';
import Button from '../Button';
import { CATEGORIES } from '../../utils/constants';
import { TripUser, Currency, Expense, CurrencyCode, toCents } from '../../types';
import { ToastType } from '../Toast';
import { useExpenseForm } from '../../hooks/useExpenseForm';
import { useTrip } from '../../context/TripContext';
import { formatMoney } from '../../utils/formatters';

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
  const { actions } = useTrip();

  const { formState, setters, logic, isSubmitting } = useExpenseForm({
    initialData: initialData || null,
    users,
    currency,
    onSubmit: async (data) => {
      try {
        if (initialData) {
          await actions.updateExpense(initialData.id, data);
          showToast('Despesa actualitzada correctament', 'success');
        } else {
          await actions.addExpense(data);
          showToast('Despesa creada correctament', 'success');
        }
        onClose();
      } catch (error) {
        console.error(error);
        showToast('Error al guardar la despesa', 'error');
      }
    }
  });

  // --- UI LOGIC & CALCULATIONS ---
  
  // Calculem en temps real l'estat del repartiment exacte
  const exactModeStats = useMemo(() => {
    if (formState.splitType !== 'exact') return null;

    const totalAmount = parseFloat(formState.amount) || 0;
    
    // Sumem els detalls (assumim que el hook guarda strings o numbers, ho convertim segur)
    const allocatedAmount = Object.values(formState.splitDetails || {}).reduce((acc, val) => {
        const num = parseFloat(val as string);
        return acc + (isNaN(num) ? 0 : num);
    }, 0);

    const remainder = totalAmount - allocatedAmount;
    // Fem servir una petita epsilon per evitar errors visuals de flotants (0.0000001)
    const isOverAllocated = remainder < -0.001; 
    const isFullyAllocated = Math.abs(remainder) < 0.001;

    return {
        totalAmount,
        allocatedAmount,
        remainder,
        isOverAllocated,
        isFullyAllocated
    };
  }, [formState.amount, formState.splitDetails, formState.splitType]);


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Despesa' : 'Nova Despesa'}>
      <form onSubmit={logic.handleSubmit} className="space-y-6">
        
        {/* --- AMOUNT INPUT (DESBLOQUEJAT PER UX) --- */}
        <div className="flex gap-4">
            <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Import Total</label>
                <div className="relative">
                    <input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        required 
                        // UX UPGRADE: Ja no bloquegem l'input en mode exacte.
                        // L'usuari pot definir el total i l'app calcula el romanent.
                        value={formState.amount} 
                        onChange={(e) => setters.setAmount(e.target.value)} 
                        className={`w-full p-4 pl-12 text-3xl font-bold rounded-2xl border outline-none transition-all
                            bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 
                            focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10
                            ${exactModeStats?.isOverAllocated ? 'border-rose-500 text-rose-600 focus:border-rose-500 focus:ring-rose-500/10' : ''}
                        `}
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">
                        {currency.symbol}
                    </span>
                </div>
            </div>
        </div>

        {/* TITLE INPUT */}
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Concepte</label>
            <input 
                type="text" 
                placeholder="Ex: Sopar, Taxi, Supermercat..." 
                required 
                value={formState.title} 
                onChange={(e) => setters.setTitle(e.target.value)} 
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 transition-colors font-medium text-lg"
            />
        </div>

        {/* DETAILS: PAYER & DATE */}
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pagador</label>
                <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <select 
                        value={formState.payer} 
                        onChange={(e) => setters.setPayer(e.target.value)} 
                        className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 appearance-none font-medium"
                    >
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Data</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input 
                        type="date" 
                        value={formState.date} 
                        onChange={(e) => setters.setDate(e.target.value)} 
                        className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-medium"
                    />
                </div>
            </div>
        </div>

        {/* CATEGORIES */}
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Categoria</label>
            <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                    <button
                        key={cat.id}
                        type="button"
                        onClick={() => setters.setCategory(cat.id)}
                        className={`
                            flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all
                            ${formState.category === cat.id 
                                ? `border-${cat.color.split('-')[1]}-500 bg-${cat.color.split('-')[1]}-50 text-${cat.color.split('-')[1]}-700` 
                                : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 text-slate-500'
                            }
                        `}
                    >
                        <cat.icon className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-bold">{cat.label}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* DIVISIÓ DE LA DESPESA */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl mb-4">
                {[
                    { id: 'equal', icon: Users, label: 'Equitatiu' },
                    { id: 'exact', icon: Calculator, label: 'Exacte' },
                    { id: 'percent', icon: PieChart, label: 'Percentatge' }, // 'shares' mode
                ].map((type) => (
                    <button
                        key={type.id}
                        type="button"
                        onClick={() => setters.setSplitType(type.id as any)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                            formState.splitType === type.id 
                                ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' 
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <type.icon size={16} />
                        <span className="hidden sm:inline">{type.label}</span>
                    </button>
                ))}
            </div>

            {/* FEEDBACK VISUAL MODE EXACTE (NOU) */}
            {formState.splitType === 'exact' && exactModeStats && (
                <div className={`mb-3 p-3 rounded-xl text-sm font-medium border flex items-center gap-2
                    ${exactModeStats.isOverAllocated 
                        ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400' 
                        : 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-300'}
                `}>
                    <AlertCircle size={16} className={exactModeStats.isOverAllocated ? 'animate-pulse' : ''} />
                    <div className="flex-1 flex justify-between">
                        <span>
                            {exactModeStats.isOverAllocated 
                                ? 'Has superat el total per:' 
                                : exactModeStats.isFullyAllocated 
                                    ? 'Tot repartit correctament.'
                                    : 'Falten per assignar (ho paga el pagador):'}
                        </span>
                        <span className="font-bold">
                            {formatMoney(toCents(Math.abs(exactModeStats.remainder) * 100), currency)}
                        </span>
                    </div>
                </div>
            )}

            {/* EQUAL MODE */}
            {formState.splitType === 'equal' && (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {users.map(u => {
                        const isSelected = formState.involved.includes(u.id);
                        return (
                            <button
                                key={u.id}
                                type="button"
                                onClick={() => logic.toggleInvolved(u.id)}
                                className={`
                                    flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                                    ${isSelected 
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-200' 
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 opacity-60 grayscale hover:opacity-100'
                                    }
                                `}
                            >
                                {isSelected 
                                    ? <CheckSquare className="text-indigo-600 dark:text-indigo-400 w-5 h-5 flex-shrink-0" /> 
                                    : <Square className="text-slate-400 w-5 h-5 flex-shrink-0" />
                                }
                                <span className="font-bold text-sm truncate">{u.name}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* EXACT MODE & SHARES MODE */}
            {formState.splitType !== 'equal' && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {users.map(u => (
                         <div key={u.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                             <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400`}>
                                    {u.name.charAt(0)}
                                </div>
                                <span className="font-medium text-sm">{u.name}</span>
                             </div>
                             
                             {formState.splitType === 'exact' ? (
                                <div className="relative w-28">
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        min="0" 
                                        placeholder="0" 
                                        value={formState.splitDetails[u.id] ?? ''} 
                                        onChange={(e) => logic.handleDetailChange(u.id, e.target.value)} 
                                        className={`w-full p-1.5 pl-6 text-right bg-white dark:bg-slate-900 border rounded-md text-sm font-bold outline-none focus:border-indigo-500
                                            ${(exactModeStats?.isOverAllocated && (formState.splitDetails[u.id] || 0) > 0) 
                                                ? 'border-rose-200 text-rose-600' 
                                                : 'border-slate-200 dark:border-slate-600'}
                                        `}
                                    />
                                    <span className="absolute left-2 top-1.5 text-slate-400 text-xs">{currency.symbol}</span>
                                </div>
                             ) : (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400 font-medium uppercase">Parts</span>
                                    <input 
                                        type="number" 
                                        step="0.5" 
                                        min="0" 
                                        placeholder="0" 
                                        value={formState.splitDetails[u.id] ?? ''} 
                                        onChange={(e) => logic.handleDetailChange(u.id, e.target.value)} 
                                        className="w-16 p-1.5 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-md text-sm font-bold outline-none focus:border-indigo-500"
                                    />
                                </div>
                             )}
                         </div>
                    ))}
                </div>
            )}
        </div>

        <div className="flex gap-3 pt-2">
            {initialData && onDelete && (
                <button type="button" onClick={() => onDelete(initialData.id)} className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors">
                    <X size={20} />
                </button>
            )}
            <Button 
                type="submit" 
                className="flex-1" 
                loading={isSubmitting}
                // UX UPGRADE: Bloquegem el botó si els números no quadren (només en excés)
                disabled={formState.splitType === 'exact' && exactModeStats?.isOverAllocated}
            >
                {initialData ? 'Guardar Canvis' : 'Crear Despesa'}
            </Button>
        </div>
      </form>
    </Modal>
  );
}