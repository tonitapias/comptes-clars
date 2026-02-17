import React, { useState, useEffect, useMemo } from 'react';
import { 
  User as UserIcon, Check, Trash2, X, 
  PieChart, Percent, Calendar, AlignCenter
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

// --- TYPES & HELPERS ---

interface ExtendedSplitMode {
  id: string;
  label: string;
  icon: any;
  mappedType?: SplitType;
}

const EXTENDED_MODES: ExtendedSplitMode[] = [
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

// UX: Funció millorada per escalar la font dinàmicament
const getAmountFontSize = (value: string) => {
  const len = value.length;
  if (len > 10) return 'text-3xl';
  if (len > 7) return 'text-4xl';
  if (len > 5) return 'text-5xl';
  return 'text-6xl';
};

// --- SUBCOMPONENT: SELECTOR DE MODE NET ---

interface SplitModeSelectorProps {
  currentMode: string;
  onModeChange: (modeId: string, mappedType?: SplitType) => void;
}

const SplitModeSelector: React.FC<SplitModeSelectorProps> = ({ currentMode, onModeChange }) => {
  const { trigger } = useHapticFeedback();

  const orderedModes = useMemo(() => VISUAL_MODE_ORDER
    .map(id => EXTENDED_MODES.find(m => m.id === id))
    .filter((m): m is ExtendedSplitMode => !!m), []);

  const handlePress = (mode: ExtendedSplitMode) => {
      trigger('light');
      onModeChange(mode.id, mode.mappedType);
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl mb-6 flex gap-1 shadow-inner">
      {orderedModes.map((mode) => {
        const isActive = currentMode === mode.id;
        const Icon = mode.icon; 
        
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => handlePress(mode)}
            className={`
              relative flex-1 py-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
              ${isActive 
                ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm scale-[1.02] ring-1 ring-black/5 dark:ring-white/10' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }
            `}
          >
            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className="mb-0.5" />
            <span className={isActive ? 'opacity-100' : 'opacity-70'}>{mode.label}</span>
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

  // Hook original intacte
  const { formState, setters, logic, isSubmitting, exactSplitStats } = useExpenseForm({
    initialData: initialData || null,
    users,
    currency,
    onSubmit: async (data) => {
      try {
        if (initialData && initialData.id) {
          const safeId = String(initialData.id);
          await actions.updateExpense(safeId, data);
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
    // Regex per permetre decimals
    if (/^\d*([.,]\d{0,2})?$/.test(val)) {
      setters.setAmount(val);
    }
  };

  // UX Helpers
  const remainingFormatted = exactSplitStats 
    ? formatMoney(toCents(Math.abs(exactSplitStats.remainderCents)), currency) 
    : '';

  const labelClasses = "text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1 mb-1.5 block";
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Despesa' : 'Nova Despesa'}>
      <form onSubmit={logic.handleSubmit} className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 -m-5 sm:-m-6 relative overflow-hidden"> 
        
        {/* --- SECTION 1: HERO HEADER (Fixed) --- */}
        <div className="bg-white dark:bg-slate-900 pt-4 pb-6 px-6 z-10 shrink-0 border-b border-slate-100 dark:border-slate-800 shadow-sm relative">
            <div className="flex flex-col items-center gap-2">
                
                {/* AMOUNT INPUT */}
                <div className="relative w-full flex justify-center items-baseline gap-1 group">
                    <span className={`font-bold text-slate-400 dark:text-slate-500 translate-y-[-4px] transition-all duration-300 ${formState.amount ? 'text-3xl' : 'text-2xl opacity-50'}`}>
                        {currency.symbol}
                    </span>
                    <input 
                        type="text" 
                        inputMode="decimal"
                        placeholder="0" 
                        required 
                        autoFocus={!initialData}
                        value={formState.amount} 
                        onChange={handleAmountChange} 
                        className={`
                            bg-transparent outline-none font-black text-center 
                            placeholder:text-slate-200 dark:placeholder:text-slate-700
                            caret-primary tabular-nums tracking-tighter max-w-[80%]
                            transition-all duration-200
                            ${getAmountFontSize(formState.amount)}
                            ${exactSplitStats?.isOverAllocated ? 'text-rose-500' : 'text-slate-900 dark:text-white'}
                        `}
                    />
                </div>

                {/* TITLE INPUT */}
                <div className="w-full max-w-sm relative">
                    <input 
                        type="text" 
                        placeholder="Concepte (Ex: Sopar, Taxi...)" 
                        required 
                        value={formState.title} 
                        onChange={(e) => setters.setTitle(e.target.value)} 
                        className="w-full text-center bg-slate-100 dark:bg-slate-800 border-none outline-none rounded-xl text-base font-semibold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-primary/20 dark:focus:bg-slate-900 transition-all py-3 px-4 shadow-sm"
                    />
                </div>
            </div>
        </div>

        {/* --- SECTION 2: SCROLLABLE CONTENT --- */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-6">
            
            {/* ROW: PAYER & DATE */}
            <div className="grid grid-cols-5 gap-3">
                {/* PAYER (3/5 width) */}
                <div className="col-span-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all shadow-sm">
                    <label className={labelClasses}>Pagador</label>
                    <div className="relative flex items-center">
                        <UserIcon className="absolute left-3 text-slate-400 pointer-events-none" size={16} />
                        <select 
                            value={formState.payer} 
                            onChange={(e) => setters.setPayer(e.target.value)} 
                            className="w-full h-10 pl-9 pr-4 bg-transparent outline-none text-sm font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
                        >
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* DATE (2/5 width) */}
                <div className="col-span-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all shadow-sm">
                    <label className={labelClasses}>Data</label>
                    <div className="relative flex items-center">
                        <Calendar className="absolute left-3 text-slate-400 pointer-events-none" size={16} />
                        <input 
                            type="date" 
                            value={formState.date} 
                            onChange={(e) => setters.setDate(e.target.value)} 
                            className="w-full h-10 pl-9 pr-1 bg-transparent outline-none text-xs font-bold text-slate-700 dark:text-slate-200 text-center cursor-pointer min-w-0" 
                        />
                    </div>
                </div>
            </div>

            {/* CATEGORIES GRID */}
            <div>
                <label className={labelClasses}>Categoria</label>
                <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                        const isSelected = formState.category === cat.id;
                        const colorBase = cat.color.split('-')[1]; // Extreu 'emerald', 'blue', etc.
                        
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => { trigger('light'); setters.setCategory(cat.id); }}
                                className={`
                                    flex flex-col items-center justify-center aspect-square rounded-2xl transition-all duration-200 outline-none
                                    active:scale-95 border
                                    ${isSelected 
                                        ? `bg-white dark:bg-slate-800 border-${colorBase}-500 shadow-md ring-2 ring-${colorBase}-500/20` 
                                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                    }
                                `}
                            >
                                <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors
                                    ${isSelected 
                                        ? `bg-${colorBase}-100 text-${colorBase}-600 dark:bg-${colorBase}-900/50 dark:text-${colorBase}-400` 
                                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                                    }
                                `}>
                                    <cat.icon size={16} strokeWidth={2.5} />
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-tight ${isSelected ? `text-${colorBase}-600 dark:text-${colorBase}-400` : 'text-slate-400'}`}>
                                    {cat.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* SPLIT SECTION */}
            <div className="pb-4">
                <div className="flex items-center justify-between mb-2 px-1">
                    <label className={labelClasses + " !mb-0"}>Repartiment</label>
                    
                    {/* Error Feedback Pill */}
                    {formState.splitType === SPLIT_TYPES.EXACT && exactSplitStats && !exactSplitStats.isFullyAllocated && (
                        <div className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1.5 animate-pulse
                            ${exactSplitStats.isOverAllocated ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}
                        `}>
                            <span>{exactSplitStats.isOverAllocated ? 'Sobren' : 'Falten'}</span>
                            <span className="tabular-nums bg-white/50 dark:bg-black/20 px-1 rounded">{remainingFormatted}</span>
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <SplitModeSelector currentMode={uiMode} onModeChange={(id, map) => {
                         setUiMode(id);
                         setters.setSplitType(map || (id as SplitType));
                    }} />

                    {/* USER LIST & INPUTS */}
                    <div className="space-y-3">
                        {users.map(u => (
                             <div key={u.id} className="flex items-center justify-between gap-3">
                                 
                                 {/* Toggle Button / Name */}
                                 <button
                                    type="button"
                                    onClick={() => { 
                                        if(formState.splitType === SPLIT_TYPES.EQUAL) {
                                            trigger('light'); 
                                            logic.toggleInvolved(u.id); 
                                        }
                                    }}
                                    disabled={formState.splitType !== SPLIT_TYPES.EQUAL}
                                    className={`
                                        flex items-center gap-3 flex-1 text-left group transition-all rounded-xl p-1 -ml-1
                                        ${formState.splitType === SPLIT_TYPES.EQUAL ? 'hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer' : 'cursor-default'}
                                    `}
                                 >
                                    <div className={`
                                        w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 border-2
                                        ${formState.splitType === SPLIT_TYPES.EQUAL 
                                            ? (formState.involved.includes(u.id) 
                                                ? 'bg-primary border-primary text-white shadow-md shadow-primary/20 scale-100' 
                                                : 'bg-transparent border-slate-200 dark:border-slate-700 text-transparent scale-90 grayscale opacity-50')
                                            : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500 font-bold text-xs'
                                        }
                                    `}>
                                        {formState.splitType === SPLIT_TYPES.EQUAL 
                                            ? <Check size={16} strokeWidth={4} /> 
                                            : u.name.charAt(0)
                                        }
                                    </div>
                                    
                                    <span className={`font-bold text-sm truncate transition-colors ${
                                        (formState.splitType === SPLIT_TYPES.EQUAL && !formState.involved.includes(u.id)) 
                                        ? 'text-slate-300 dark:text-slate-600 line-through decoration-2' 
                                        : 'text-slate-700 dark:text-slate-200'
                                    }`}>
                                        {u.name}
                                    </span>
                                 </button>
                                 
                                 {/* Manual Inputs */}
                                 {formState.splitType !== SPLIT_TYPES.EQUAL && (
                                    <div className="w-24 sm:w-32 animate-fade-in">
                                        {formState.splitType === SPLIT_TYPES.EXACT ? (
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    inputMode="decimal"
                                                    placeholder="0" 
                                                    value={formState.splitDetails[u.id] ?? ''} 
                                                    onChange={(e) => logic.handleDetailChange(u.id, e.target.value)}
                                                    className={`
                                                        w-full h-11 px-3 text-right bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20 tabular-nums transition-all
                                                        ${(exactSplitStats?.isOverAllocated && parseFloat(formState.splitDetails[u.id] || '0') > 0) 
                                                            ? 'border-rose-300 text-rose-600 bg-rose-50 dark:bg-rose-900/10' 
                                                            : 'border-slate-200 dark:border-slate-700 focus:border-primary focus:bg-white dark:focus:bg-slate-900'}
                                                    `}
                                                />
                                            </div>
                                        ) : (
                                            <div className="relative flex items-center">
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const current = parseFloat(formState.splitDetails[u.id] || '0');
                                                        logic.handleDetailChange(u.id, Math.max(0, current - 1).toString());
                                                    }}
                                                    className="absolute left-0 w-8 h-full flex items-center justify-center text-slate-400 hover:text-primary active:scale-90 z-10"
                                                >
                                                    -
                                                </button>
                                                <input 
                                                    type="number" 
                                                    inputMode="decimal"
                                                    min="0" placeholder="0"
                                                    step={uiMode === 'percent' ? "0.1" : "1"} 
                                                    value={formState.splitDetails[u.id] ?? ''} 
                                                    onChange={(e) => logic.handleDetailChange(u.id, e.target.value)} 
                                                    className="w-full h-11 px-8 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-slate-900 tabular-nums transition-all"
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const current = parseFloat(formState.splitDetails[u.id] || '0');
                                                        logic.handleDetailChange(u.id, (current + 1).toString());
                                                    }}
                                                    className="absolute right-0 w-8 h-full flex items-center justify-center text-slate-400 hover:text-primary active:scale-90 z-10"
                                                >
                                                    +
                                                </button>
                                                {uiMode === 'percent' && <span className="absolute right-[-1.5rem] text-slate-400 text-[10px] font-bold">%</span>}
                                            </div>
                                        )}
                                    </div>
                                 )}
                             </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="h-12" /> {/* Spacer extra */}
        </div>

        {/* --- SECTION 3: STICKY FOOTER --- */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 z-50 shadow-[0_-5px_20px_-10px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3">
                {initialData && onDelete && (
                    <div className="flex items-center">
                        {isDeleting ? (
                            <button 
                                type="button"
                                onClick={() => initialData?.id && onDelete?.(initialData.id)}
                                className="h-14 px-4 rounded-2xl bg-rose-50 text-rose-600 font-bold text-xs border border-rose-100 whitespace-nowrap active:scale-95 transition-transform"
                            >
                                Segur?
                            </button>
                        ) : (
                            <button 
                                type="button" 
                                onClick={() => setIsDeleting(true)} 
                                className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all active:scale-95"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                         {isDeleting && (
                            <button 
                                type="button" 
                                onClick={() => setIsDeleting(false)}
                                className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 ml-2"
                            >
                                <X size={20} />
                            </button>
                         )}
                    </div>
                )}
                
                <Button 
                    type="submit" 
                    fullWidth
                    className="h-14 text-base font-bold shadow-xl shadow-primary/20 rounded-2xl" 
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