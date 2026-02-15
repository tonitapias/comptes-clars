import React, { useState, useEffect } from 'react';
import { Calendar, User as UserIcon, AlertCircle, Check, Trash2, X } from 'lucide-react';
import Modal from '../Modal';
import Button from '../Button';
import { CATEGORIES, UI_SPLIT_MODES, SPLIT_TYPES } from '../../utils/constants';
import { TripUser, Currency, Expense, toCents, SplitType } from '../../types';
import { ToastType } from '../Toast';
import { useExpenseForm } from '../../hooks/useExpenseForm';
import { useTrip } from '../../context/TripContext';
import { formatMoney } from '../../utils/formatters';
// UX ADDITION: Importem feedback hàptic
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

// --- HELPERS VISUALS ---

const getAmountFontSize = (value: string) => {
  const len = value.length;
  if (len > 10) return 'text-3xl';
  if (len > 7) return 'text-4xl';
  return 'text-5xl';
};

// --- SUBCOMPONENTS ---

interface SplitModeSelectorProps {
  currentMode: string;
  onModeChange: (modeId: string, mappedType?: SplitType) => void;
}

const SplitModeSelector: React.FC<SplitModeSelectorProps> = ({ currentMode, onModeChange }) => {
  const { trigger } = useHapticFeedback();

  const handlePress = (modeId: string, mappedType?: SplitType) => {
      trigger('light'); // UX: Feedback al canviar mode
      onModeChange(modeId, mappedType);
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl mb-6 flex gap-1">
      {UI_SPLIT_MODES.map((mode) => {
        const isActive = currentMode === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => handlePress(mode.id, mode.mappedType)}
            className={`
              flex-1 py-3 rounded-xl text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
              ${isActive 
                ? 'bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-indigo-400 ring-1 ring-black/5 dark:ring-white/5 scale-[1.02] font-black' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }
            `}
          >
            <mode.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`${isActive ? 'opacity-100' : 'opacity-70'} text-xs sm:text-sm`}>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
};

interface EqualSplitSectionProps {
  users: TripUser[];
  involved: string[];
  onToggle: (id: string) => void;
}

const EqualSplitSection: React.FC<EqualSplitSectionProps> = ({ users, involved, onToggle }) => {
  const { trigger } = useHapticFeedback();
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {users.map(u => {
        const isSelected = involved.includes(u.id);
        return (
          <button
            key={u.id}
            type="button"
            onClick={() => {
                trigger('light');
                onToggle(u.id);
            }}
            className={`
              flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left outline-none relative overflow-hidden
              active:scale-[0.98]
              focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1
              ${isSelected 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-100 shadow-sm' 
                : 'bg-surface-card border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }
            `}
          >
            <div className={`
              w-6 h-6 rounded-lg flex items-center justify-center transition-colors
              ${isSelected ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}
            `}>
               {isSelected ? <Check size={14} strokeWidth={3} /> : null}
            </div>
            <span className="font-bold text-sm truncate flex-1">{u.name}</span>
          </button>
        );
      })}
    </div>
  );
};

// --- COMPONENT PRINCIPAL ---

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
  const { trigger } = useHapticFeedback(); // Hook per a la modal principal
  const [isDeleting, setIsDeleting] = useState(false);

  const { formState, setters, logic, isSubmitting, exactSplitStats } = useExpenseForm({
    initialData: initialData || null,
    users,
    currency,
    onSubmit: async (data) => {
      try {
        if (initialData) {
          await actions.updateExpense(initialData.id, data);
          trigger('success'); // Feedback d'èxit
          showToast('Despesa actualitzada correctament', 'success');
        } else {
          await actions.addExpense(data);
          trigger('success'); // Feedback d'èxit
          showToast('Despesa creada correctament', 'success');
        }
        onClose();
      } catch (error) {
        console.error(error);
        trigger('medium'); // Feedback d'error (vibració diferent)
        showToast('Error al guardar la despesa', 'error');
      }
    }
  });

  const [uiMode, setUiMode] = useState<string>(formState.splitType);

  useEffect(() => {
    if (formState.splitType === SPLIT_TYPES.SHARES && uiMode !== 'percent' && uiMode !== 'shares') {
       setUiMode('percent');
    } else if (formState.splitType !== SPLIT_TYPES.SHARES) {
       setUiMode(formState.splitType);
    }
  }, [formState.splitType]);

  useEffect(() => {
    if (!isOpen) setIsDeleting(false);
  }, [isOpen, initialData]);

  const handleModeChange = (modeId: string, mappedType?: SplitType) => {
    setUiMode(modeId);
    const targetType = mappedType || (modeId as SplitType);
    setters.setSplitType(targetType);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*([.,]\d{0,2})?$/.test(val)) {
      setters.setAmount(val);
    }
  };

  const handleCategorySelect = (catId: string) => {
      trigger('light');
      setters.setCategory(catId);
  }

  // Estil comú per inputs per garantir alçada idèntica (UX FIX #1)
  const inputBaseClasses = "w-full p-3.5 pl-4 bg-surface-card border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-bold text-content-body transition-all shadow-sm min-h-[3.5rem] appearance-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Despesa' : 'Nova Despesa'}>
      <form onSubmit={logic.handleSubmit} className="space-y-8 pb-4"> 
        
        {/* --- HERO SECTION: AMOUNT & TITLE --- */}
        <div className="bg-surface-ground -mx-6 -mt-2 px-6 py-8 border-b border-slate-100 dark:border-slate-800 flex flex-col items-center gap-6">
            
            {/* AMOUNT INPUT */}
            <div className="relative group w-full max-w-[80%] text-center">
                <label className="sr-only">Import</label>
                <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-slate-400 dark:text-slate-500 mb-1 select-none">
                        {currency.symbol}
                    </span>
                    <input 
                        type="text" 
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="0" 
                        required 
                        autoFocus={!initialData}
                        value={formState.amount} 
                        onChange={handleAmountChange} 
                        className={`
                            w-full bg-transparent outline-none font-black text-center text-content-body 
                            placeholder:text-slate-300 dark:placeholder:text-slate-600
                            caret-primary tabular-nums
                            transition-all duration-200
                            ${getAmountFontSize(formState.amount)}
                            ${exactSplitStats?.isOverAllocated ? 'text-status-error' : ''}
                        `}
                    />
                </div>
                {/* Underline effect - Millorat */}
                <div className="h-1.5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-2 group-focus-within:bg-primary group-focus-within:w-24 transition-all duration-300 ease-out" />
            </div>

            {/* TITLE INPUT */}
            <div className="w-full">
                <input 
                    type="text" 
                    placeholder="Què heu pagat?" 
                    required 
                    value={formState.title} 
                    onChange={(e) => setters.setTitle(e.target.value)} 
                    className="w-full text-center bg-transparent border-none outline-none text-xl font-bold text-content-body placeholder:text-content-subtle focus:placeholder:text-primary/50 transition-colors"
                />
            </div>
        </div>

        {/* --- DETAILS GRID --- */}
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-xs font-bold text-content-subtle uppercase tracking-wider ml-1">Pagador</label>
                <div className="relative">
                    <select 
                        value={formState.payer} 
                        onChange={(e) => setters.setPayer(e.target.value)} 
                        className={inputBaseClasses}
                    >
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-content-subtle pointer-events-none" size={18} />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-content-subtle uppercase tracking-wider ml-1">Data</label>
                <div className="relative">
                    <input 
                        type="date" 
                        value={formState.date} 
                        onChange={(e) => setters.setDate(e.target.value)} 
                        className={inputBaseClasses}
                    />
                    {/* Icona decorativa, l'input natiu mana sobre l'àrea */}
                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-content-subtle pointer-events-none" size={18} />
                </div>
            </div>
        </div>

        {/* --- CATEGORIES --- */}
        <div className="space-y-3">
            <label className="text-xs font-bold text-content-subtle uppercase tracking-wider ml-1">Categoria</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                    const isSelected = formState.category === cat.id;
                    const colorBase = cat.color.split('-')[1];
                    
                    return (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleCategorySelect(cat.id)}
                            className={`
                                relative flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200 outline-none
                                border active:scale-95 min-h-[5.5rem]
                                focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900
                                ${isSelected 
                                    ? `bg-${colorBase}-50 border-${colorBase}-200 text-${colorBase}-700 dark:bg-${colorBase}-900/30 dark:border-${colorBase}-800 dark:text-${colorBase}-300 shadow-sm ring-1 ring-${colorBase}-200 dark:ring-${colorBase}-800` 
                                    : 'bg-surface-card border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }
                            `}
                        >
                            <cat.icon className={`w-7 h-7 mb-2 transition-transform ${isSelected ? 'scale-110' : 'scale-100'}`} strokeWidth={2} />
                            <span className="text-[11px] font-bold leading-none">{cat.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>

        {/* --- SPLIT SECTION --- */}
        <div className="space-y-3">
            <label className="text-xs font-bold text-content-subtle uppercase tracking-wider ml-1">Repartiment</label>
            <div className="bg-surface-ground p-5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800">
                <SplitModeSelector currentMode={uiMode} onModeChange={handleModeChange} />

                {formState.splitType === SPLIT_TYPES.EXACT && exactSplitStats && (
                    <div className={`mb-4 p-4 rounded-2xl text-sm font-bold border flex items-center gap-3 animate-in slide-in-from-top-2 transition-colors duration-300
                        ${exactSplitStats.isOverAllocated 
                            ? 'bg-status-error/15 border-status-error/30 text-status-error' 
                            : 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-300'}
                    `}>
                        <AlertCircle size={20} className={exactSplitStats.isOverAllocated ? 'animate-pulse' : ''} />
                        <div className="flex-1 flex justify-between items-center">
                            <span>
                                {exactSplitStats.isOverAllocated ? 'Sobren:' : exactSplitStats.isFullyAllocated ? 'Repartit:' : 'Falten:'}
                            </span>
                            <span className="font-black text-lg tabular-nums">
                                {formatMoney(toCents(Math.abs(exactSplitStats.remainderCents)), currency)}
                            </span>
                        </div>
                    </div>
                )}

                {formState.splitType === SPLIT_TYPES.EQUAL ? (
                    <EqualSplitSection users={users} involved={formState.involved} onToggle={logic.toggleInvolved} />
                ) : (
                    <div className="space-y-2.5">
                        {users.map(u => (
                             <div key={u.id} className="flex items-center justify-between p-3 bg-surface-card rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-black text-slate-500">
                                        {u.name.charAt(0)}
                                    </div>
                                    <span className="font-bold text-content-body">{u.name}</span>
                                 </div>
                                 
                                 {formState.splitType === SPLIT_TYPES.EXACT ? (
                                    <div className="relative w-32">
                                        <input 
                                            type="text" 
                                            inputMode="decimal"
                                            placeholder="0" 
                                            value={formState.splitDetails[u.id] ?? ''} 
                                            onChange={(e) => {
                                                if (/^\d*([.,]\d{0,2})?$/.test(e.target.value)) logic.handleDetailChange(u.id, e.target.value);
                                            }}
                                            className={`w-full p-2.5 pl-8 text-right bg-surface-ground border rounded-xl text-lg font-bold outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all tabular-nums
                                                ${(exactSplitStats?.isOverAllocated && (formState.splitDetails[u.id] || 0) > 0) 
                                                    ? 'border-status-error text-status-error' 
                                                    : 'border-slate-200 dark:border-slate-700 text-content-body'}
                                            `}
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-subtle text-sm font-bold">{currency.symbol}</span>
                                    </div>
                                 ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-content-subtle font-black uppercase tracking-wider">
                                            {uiMode === 'percent' ? '%' : 'PARTS'}
                                        </span>
                                        <input 
                                            type="number" 
                                            inputMode="numeric"
                                            step={uiMode === 'percent' ? "0.1" : "1"} 
                                            min="0" placeholder="0" 
                                            value={formState.splitDetails[u.id] ?? ''} 
                                            onChange={(e) => logic.handleDetailChange(u.id, e.target.value)} 
                                            className="w-20 p-2 text-center bg-surface-ground border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-bold outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all tabular-nums"
                                        />
                                    </div>
                                 )}
                             </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* --- FOOTER ACTIONS --- */}
        <div className="flex items-center gap-3 pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
            {initialData && onDelete && (
                <div className="flex items-center">
                    {isDeleting ? (
                        <div className="flex gap-2 animate-scale-in origin-left">
                            <button 
                                type="button"
                                onClick={() => setIsDeleting(false)}
                                className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <button 
                                type="button"
                                onClick={() => onDelete(initialData.id)}
                                className="px-5 h-12 rounded-xl bg-status-error text-white font-bold text-sm shadow-md hover:bg-rose-700 active:scale-95 transition-all whitespace-nowrap"
                            >
                                Confirmar
                            </button>
                        </div>
                    ) : (
                        <button 
                            type="button" 
                            onClick={() => setIsDeleting(true)} 
                            className="w-14 h-14 flex items-center justify-center rounded-2xl bg-status-error/10 text-status-error hover:bg-status-error/20 transition-colors"
                        >
                            <Trash2 size={22} strokeWidth={2} />
                        </button>
                    )}
                </div>
            )}
            
            <Button 
                type="submit" 
                fullWidth
                className="h-14 text-lg shadow-financial-lg" 
                loading={isSubmitting}
                haptic="success" // UX: Feedback en el botó principal
                disabled={formState.splitType === SPLIT_TYPES.EXACT && exactSplitStats?.isOverAllocated}
            >
                {initialData ? 'Guardar Canvis' : 'Afegir Despesa'}
            </Button>
        </div>
      </form>
    </Modal>
  );
}