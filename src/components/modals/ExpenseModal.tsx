// src/components/modals/ExpenseModal.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { X, Calendar, User as UserIcon, CheckSquare, Square, AlertCircle } from 'lucide-react';
import Modal from '../Modal';
import Button from '../Button';
import { CATEGORIES, UI_SPLIT_MODES, SPLIT_TYPES } from '../../utils/constants'; // [FIX] Constants centralitzades
import { TripUser, Currency, Expense, toCents, SplitType } from '../../types';
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

  // --- UI STATE: Gestionem la pestanya activa visualment ---
  // Si venim d'editar 'shares', per defecte ho mostrem com a 'percent' si la suma és 100? 
  // Per simplicitat i Risc Zero, si és shares ho mostrem com a 'percent' (mode més comú) o mantenim la lògica simple.
  // Aquí inicialitzem l'estat visual basat en el tipus real.
  const [uiMode, setUiMode] = useState<string>(formState.splitType);

  // Sincronitzem l'estat visual quan canvia l'extern (ex: reset form)
  useEffect(() => {
    // Si el tipus és SHARES, podríem voler mantenir l'últim mode visual seleccionat ('percent' o 'shares').
    // Per defecte, si ve de DB com a SHARES, ho tractem com a 'percent' que és l'ús més habitual.
    if (formState.splitType === SPLIT_TYPES.SHARES && uiMode !== 'percent' && uiMode !== 'shares') {
       setUiMode('percent');
    } else if (formState.splitType !== SPLIT_TYPES.SHARES) {
       setUiMode(formState.splitType);
    }
  }, [formState.splitType]);


  // --- HANDLER DE CANVI DE MODE ---
  const handleModeChange = (modeId: string, mappedType?: SplitType) => {
    setUiMode(modeId); // Canvi visual immediat (pestanya activa)
    
    // Si el mode té un mapeig (ex: percent -> shares), usem el mapeig.
    // Si no, usem l'ID directament (ex: equal, exact).
    const targetType = mappedType || (modeId as SplitType);
    setters.setSplitType(targetType);
  };


  // --- CÀLCULS VISUALS (Mode Exacte) ---
  const exactModeStats = useMemo(() => {
    if (formState.splitType !== SPLIT_TYPES.EXACT) return null;

    const parseToCents = (val: string | number): number => {
        const floatVal = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(floatVal) ? 0 : Math.round(floatVal * 100);
    };

    const totalCents = parseToCents(formState.amount);
    
    const allocatedCents = Object.values(formState.splitDetails || {}).reduce((acc, val) => {
        return acc + parseToCents(val);
    }, 0);

    const remainderCents = totalCents - allocatedCents;

    return {
        isOverAllocated: remainderCents < 0,
        isFullyAllocated: remainderCents === 0,
        remainderCents 
    };
  }, [formState.amount, formState.splitDetails, formState.splitType]);


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Despesa' : 'Nova Despesa'}>
      <form onSubmit={logic.handleSubmit} className="space-y-6">
        
        {/* --- AMOUNT INPUT --- */}
        <div className="flex gap-4">
            <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Import Total</label>
                <div className="relative">
                    <input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        required 
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
            {/* [FIX] Generació dinàmica de botons basada en constants UI */}
            <div className="flex gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl mb-4">
                {UI_SPLIT_MODES.map((mode) => (
                    <button
                        key={mode.id}
                        type="button"
                        onClick={() => handleModeChange(mode.id, mode.mappedType)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                            uiMode === mode.id 
                                ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' 
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <mode.icon size={16} />
                        <span className="hidden sm:inline">{mode.label}</span>
                    </button>
                ))}
            </div>

            {/* FEEDBACK VISUAL MODE EXACTE */}
            {formState.splitType === SPLIT_TYPES.EXACT && exactModeStats && (
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
                            {formatMoney(toCents(Math.abs(exactModeStats.remainderCents)), currency)}
                        </span>
                    </div>
                </div>
            )}

            {/* EQUAL MODE */}
            {formState.splitType === SPLIT_TYPES.EQUAL && (
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

            {/* CUSTOM MODES (EXACT, SHARES, PERCENT) */}
            {formState.splitType !== SPLIT_TYPES.EQUAL && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {users.map(u => (
                         <div key={u.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                             <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400`}>
                                    {u.name.charAt(0)}
                                </div>
                                <span className="font-medium text-sm">{u.name}</span>
                             </div>
                             
                             {/* INPUT DIFERENCIAT PER MODE */}
                             {formState.splitType === SPLIT_TYPES.EXACT ? (
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
                                // MODE SHARES / PERCENT
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400 font-medium uppercase">
                                        {uiMode === 'percent' ? '%' : 'Parts'}
                                    </span>
                                    <input 
                                        type="number" 
                                        step={uiMode === 'percent' ? "0.1" : "1"} 
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
                disabled={formState.splitType === SPLIT_TYPES.EXACT && exactModeStats?.isOverAllocated}
            >
                {initialData ? 'Guardar Canvis' : 'Crear Despesa'}
            </Button>
        </div>
      </form>
    </Modal>
  );
}