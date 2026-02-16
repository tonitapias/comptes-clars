import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, User as UserIcon, Check, Trash2, X, 
  PieChart, Percent, Coins, AlertTriangle 
} from 'lucide-react';
import Modal from '../Modal';
import Button from '../Button';
import { CATEGORIES, UI_SPLIT_MODES, SPLIT_TYPES } from '../../utils/constants';
import { TripUser, Currency, Expense, toCents, SplitType } from '../../types';
import { ToastType } from '../Toast';
import { useExpenseForm } from '../../hooks/useExpenseForm';
import { useTrip } from '../../context/TripContext';
import { formatMoney } from '../../utils/formatters';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

// --- HELPERS VISUALS I CONSTANTS ---

// Definim modes fora del component per evitar re-creacions constants
const EXTENDED_MODES = [
  ...UI_SPLIT_MODES.filter(m => m.id !== 'percent'),
  { 
    id: 'shares', 
    label: 'Parts', 
    icon: PieChart, 
    mappedType: SPLIT_TYPES.SHARES 
  },
  { 
    id: 'percent', 
    label: '%', 
    icon: Percent, 
    mappedType: SPLIT_TYPES.SHARES 
  }
];

const VISUAL_MODE_ORDER = ['equal', 'exact', 'shares', 'percent'];

const getAmountFontSize = (value: string) => {
  const len = value.length;
  if (len > 9) return 'text-4xl';
  if (len > 6) return 'text-5xl';
  return 'text-6xl';
};

// --- SUBCOMPONENTS ---

interface SplitModeSelectorProps {
  currentMode: string;
  onModeChange: (modeId: string, mappedType?: SplitType) => void;
}

const SplitModeSelector: React.FC<SplitModeSelectorProps> = ({ currentMode, onModeChange }) => {
  const { trigger } = useHapticFeedback();

  const orderedModes = useMemo(() => VISUAL_MODE_ORDER
    .map(id => EXTENDED_MODES.find(m => m.id === id))
    .filter((m): m is typeof EXTENDED_MODES[0] => !!m), []);

  const handlePress = (modeId: string, mappedType?: SplitType) => {
      trigger('light');
      onModeChange(modeId, mappedType);
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-900/50 p-1 rounded-2xl mb-6 flex gap-1 border border-slate-200 dark:border-slate-800">
      {orderedModes.map((mode) => {
        const isActive = currentMode === mode.id;
        const Icon = mode.icon as React.ElementType; 
        
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => handlePress(mode.id, mode.mappedType)}
            className={`
              flex-1 py-2.5 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all duration-300
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
              ${isActive 
                ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10 scale-[1.02]' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/50'
              }
            `}
          >
            <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
            <span className={isActive ? 'opacity-100' : 'opacity-80'}>{mode.label}</span>
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
  const { trigger } = useHapticFeedback();
  const [isDeleting, setIsDeleting] = useState(false);

  const { formState, setters, logic, isSubmitting, exactSplitStats } = useExpenseForm({
    initialData: initialData || null,
    users,
    currency,
    onSubmit: async (data) => {
      try {
        if (initialData) {
          await actions.updateExpense(initialData.id, data);
          trigger('success');
          showToast('Despesa actualitzada', 'success');
        } else {
          await actions.addExpense(data);
          trigger('success');
          showToast('Despesa creada', 'success');
        }
        onClose();
      } catch (error) {
        console.error(error);
        trigger('medium');
        showToast('Error al guardar', 'error');
      }
    }
  });

  // Gestió de l'estat visual del mode de repartiment
  const [uiMode, setUiMode] = useState<string>(formState.splitType);

  useEffect(() => {
    if (formState.splitType === SPLIT_TYPES.SHARES && uiMode !== 'percent' && uiMode !== 'shares') {
       setUiMode('shares');
    } else if (formState.splitType !== SPLIT_TYPES.SHARES) {
       setUiMode(formState.splitType);
    }
  }, [formState.splitType]);

  useEffect(() => {
    if (!isOpen) setIsDeleting(false);
  }, [isOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Permetre només números i un punt/coma decimal
    if (/^\d*([.,]\d{0,2})?$/.test(val)) {
      setters.setAmount(val);
    }
  };

  const inputBaseClasses = "w-full h-12 px-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 font-bold text-content-body transition-all text-sm appearance-none";

  // Càlcul de feedback visual per Exact Split
  const splitProgressColor = exactSplitStats?.isOverAllocated 
    ? 'bg-status-error' 
    : exactSplitStats?.isFullyAllocated 
      ? 'bg-status-success' 
      : 'bg-amber-400';

  const remainingFormatted = exactSplitStats 
    ? formatMoney(toCents(Math.abs(exactSplitStats.remainderCents)), currency) 
    : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Despesa' : 'Nova Despesa'}>
      <form onSubmit={logic.handleSubmit} className="flex flex-col h-full"> 
        
        {/* --- HERO SECTION: AMOUNT & TITLE --- */}
        <div className="flex-none px-6 pb-8 pt-4 flex flex-col items-center gap-6 border-b border-slate-100 dark:border-slate-800/50">
            
            {/* AMOUNT INPUT */}
            <div className="relative w-full text-center">
                <div className={`flex items-baseline justify-center gap-1 transition-colors duration-300 ${!formState.amount ? 'text-slate-300 dark:text-slate-700' : 'text-content-body'}`}>
                    <span className="text-3xl font-bold select-none opacity-50">
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
                            bg-transparent outline-none font-black text-center 
                            placeholder:text-slate-200 dark:placeholder:text-slate-800
                            caret-primary tabular-nums tracking-tight
                            transition-all duration-200 w-full max-w-[80%]
                            ${getAmountFontSize(formState.amount)}
                            ${exactSplitStats?.isOverAllocated ? 'text-status-error' : ''}
                        `}
                    />
                </div>
            </div>

            {/* TITLE INPUT */}
            <div className="w-full relative group">
                <input 
                    type="text" 
                    placeholder="Concepte (Ex: Sopar, Taxis...)" 
                    required 
                    value={formState.title} 
                    onChange={(e) => setters.setTitle(e.target.value)} 
                    className="w-full text-center bg-transparent border-none outline-none text-lg font-bold text-content-body placeholder:text-slate-400 focus:placeholder:text-primary/40 transition-colors py-2"
                />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-slate-200 dark:bg-slate-800 group-focus-within:w-24 group-focus-within:bg-primary transition-all duration-300" />
            </div>
        </div>

        {/* --- SCROLLABLE CONTENT --- */}
        <div className="flex-1 overflow-y-auto px-1 py-6 space-y-8">
            
            {/* GRID: PAGADOR & DATA */}
            <div className="grid grid-cols-2 gap-4 px-1">
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Pagador</label>
                    <div className="relative">
                        <select 
                            value={formState.payer} 
                            onChange={(e) => setters.setPayer(e.target.value)} 
                            className={inputBaseClasses}
                        >
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <UserIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Data</label>
                    <div className="relative">
                        <input 
                            type="date" 
                            value={formState.date} 
                            onChange={(e) => setters.setDate(e.target.value)} 
                            className={`${inputBaseClasses} pr-2`} // Ajust padding right
                        />
                        {/* Calendar icon amagat en mòbil natiu, visible si no suporta date picker */}
                    </div>
                </div>
            </div>

            {/* CATEGORIES */}
            <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-2">Categoria</label>
                <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                        const isSelected = formState.category === cat.id;
                        const colorBase = cat.color.split('-')[1];
                        
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => { trigger('light'); setters.setCategory(cat.id); }}
                                className={`
                                    flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all duration-200 outline-none
                                    border active:scale-95 aspect-square
                                    focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                                    ${isSelected 
                                        ? `bg-${colorBase}-50 border-${colorBase}-200 text-${colorBase}-600 dark:bg-${colorBase}-900/30 dark:border-${colorBase}-800 dark:text-${colorBase}-300 ring-1 ring-${colorBase}-200 dark:ring-${colorBase}-800 shadow-sm` 
                                        : 'bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50'
                                    }
                                `}
                            >
                                <cat.icon className={`w-6 h-6 mb-1.5 transition-transform ${isSelected ? 'scale-110' : ''}`} strokeWidth={2} />
                                <span className="text-[10px] font-bold leading-none truncate w-full text-center">{cat.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* REPARTIMENT */}
            <div className="space-y-2">
                <div className="flex items-center justify-between ml-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Repartiment</label>
                    
                    {/* INDICADOR D'ESTAT EXACT SPLIT */}
                    {formState.splitType === SPLIT_TYPES.EXACT && exactSplitStats && (
                        <div className={`flex items-center gap-2 text-xs font-bold px-2 py-0.5 rounded-full animate-in fade-in
                            ${exactSplitStats.isOverAllocated ? 'text-status-error bg-red-50 dark:bg-red-900/20' : 
                              exactSplitStats.isFullyAllocated ? 'text-status-success bg-green-50 dark:bg-green-900/20' : 
                              'text-amber-500 bg-amber-50 dark:bg-amber-900/20'}
                        `}>
                            <span>
                                {exactSplitStats.isFullyAllocated ? 'Quadrat' : exactSplitStats.isOverAllocated ? 'Sobren:' : 'Falten:'}
                            </span>
                            {!exactSplitStats.isFullyAllocated && <span className="tabular-nums">{remainingFormatted}</span>}
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-900/30 p-4 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                    <SplitModeSelector currentMode={uiMode} onModeChange={(id, map) => {
                         const targetType = map || (id as SplitType);
                         setUiMode(id);
                         setters.setSplitType(targetType);
                    }} />

                    {/* BARRA PROGRÉS VISUAL (Exact Split) */}
                    {formState.splitType === SPLIT_TYPES.EXACT && exactSplitStats && (
                        <div className="mb-6 mx-1">
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-500 ease-out ${splitProgressColor}`}
                                    style={{ width: `${Math.min((exactSplitStats.allocatedCents / exactSplitStats.totalCents) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* LLISTA D'USUARIS */}
                    {formState.splitType === SPLIT_TYPES.EQUAL ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {users.map(u => {
                                const isSelected = formState.involved.includes(u.id);
                                return (
                                <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => { trigger('light'); logic.toggleInvolved(u.id); }}
                                    className={`
                                    flex items-center gap-3 p-3 rounded-2xl border transition-all text-left outline-none relative overflow-hidden
                                    active:scale-[0.98]
                                    ${isSelected 
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-100' 
                                        : 'bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                                    }
                                    `}
                                >
                                    <div className={`
                                    w-5 h-5 rounded-full flex items-center justify-center transition-colors border
                                    ${isSelected ? 'bg-primary border-primary text-white' : 'bg-transparent border-slate-300 text-transparent'}
                                    `}>
                                    <Check size={12} strokeWidth={4} />
                                    </div>
                                    <span className="font-bold text-sm truncate flex-1">{u.name}</span>
                                </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {users.map(u => (
                                 <div key={u.id} className="flex items-center justify-between group">
                                     <div className="flex items-center gap-3 pl-1">
                                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500 border border-slate-200 dark:border-slate-700">
                                            {u.name.charAt(0)}
                                        </div>
                                        <span className="font-bold text-sm text-content-body">{u.name}</span>
                                     </div>
                                     
                                     {formState.splitType === SPLIT_TYPES.EXACT ? (
                                        <div className="relative w-28">
                                            <input 
                                                type="text" 
                                                inputMode="decimal"
                                                placeholder="0" 
                                                value={formState.splitDetails[u.id] ?? ''} 
                                                onChange={(e) => {
                                                    if (/^\d*([.,]\d{0,2})?$/.test(e.target.value)) logic.handleDetailChange(u.id, e.target.value);
                                                }}
                                                className={`w-full py-2 pl-3 pr-7 text-right bg-slate-50 dark:bg-slate-900/50 border rounded-lg font-bold outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all tabular-nums
                                                    ${(exactSplitStats?.isOverAllocated && (formState.splitDetails[u.id] || 0) > 0) 
                                                        ? 'border-status-error text-status-error' 
                                                        : 'border-slate-200 dark:border-slate-700 text-content-body'}
                                                `}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">€</span>
                                        </div>
                                     ) : (
                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    inputMode="decimal"
                                                    step={uiMode === 'percent' ? "0.1" : "1"} 
                                                    min="0" placeholder="0" 
                                                    value={formState.splitDetails[u.id] ?? ''} 
                                                    onChange={(e) => logic.handleDetailChange(u.id, e.target.value)} 
                                                    className="w-20 py-2 pl-2 pr-6 text-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg font-bold outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all tabular-nums"
                                                />
                                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-black uppercase pointer-events-none">
                                                    {uiMode === 'percent' ? '%' : 'Pt'}
                                                </span>
                                            </div>
                                        </div>
                                     )}
                                 </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* --- FOOTER ACTIONS --- */}
        <div className="flex-none pt-4 mt-auto border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
                {initialData && onDelete && (
                    <div className="flex items-center">
                        {isDeleting ? (
                            <div className="flex gap-2 animate-in slide-in-from-left-2 fade-in duration-200">
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
                                    className="px-4 h-12 rounded-xl bg-status-error text-white font-bold text-sm shadow-sm hover:bg-rose-700 active:scale-95 transition-all whitespace-nowrap"
                                >
                                    Esborrar
                                </button>
                            </div>
                        ) : (
                            <button 
                                type="button" 
                                onClick={() => setIsDeleting(true)} 
                                className="w-12 h-12 flex items-center justify-center rounded-xl text-slate-400 hover:text-status-error hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                    </div>
                )}
                
                <Button 
                    type="submit" 
                    fullWidth
                    className="h-12 text-base shadow-financial" 
                    loading={isSubmitting}
                    haptic="success"
                    disabled={formState.splitType === SPLIT_TYPES.EXACT && exactSplitStats?.isOverAllocated}
                >
                    {initialData ? 'Guardar Canvis' : 'Crear Despesa'}
                </Button>
            </div>
        </div>
      </form>
    </Modal>
  );
}