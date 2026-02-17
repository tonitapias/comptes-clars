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

const getAmountFontSize = (value: string) => {
  const len = value.length;
  if (len > 9) return 'text-3xl';
  if (len > 6) return 'text-4xl';
  return 'text-5xl';
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
    <div className="bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl mb-6 flex gap-1">
      {orderedModes.map((mode) => {
        const isActive = currentMode === mode.id;
        const Icon = mode.icon; 
        
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => handlePress(mode)}
            className={`
              relative flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 z-0
              focus:outline-none
              ${isActive 
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm scale-[1.02]' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }
            `}
          >
            <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-primary' : ''} />
            <span className={isActive ? 'opacity-100' : 'hidden sm:inline opacity-80'}>{mode.label}</span>
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
    if (/^\d*([.,]\d{0,2})?$/.test(val)) {
      setters.setAmount(val);
    }
  };

  // Styles Helpers
  const inputBaseClasses = "w-full h-12 px-4 bg-slate-50 dark:bg-slate-900 border-0 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-bold text-slate-800 dark:text-slate-100 transition-all text-sm appearance-none";
  const labelBaseClasses = "text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1.5 block";
  
  const remainingFormatted = exactSplitStats 
    ? formatMoney(toCents(Math.abs(exactSplitStats.remainderCents)), currency) 
    : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Despesa' : 'Nova Despesa'}>
      <form onSubmit={logic.handleSubmit} className="flex flex-col h-full bg-white dark:bg-slate-950 -m-5 sm:-m-6 relative overflow-hidden"> 
        
        {/* --- SECTION 1: COMPACT HERO HEADER --- */}
        <div className="bg-white dark:bg-slate-900 pt-2 pb-6 px-6 z-10 shrink-0 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col items-center gap-1">
                {/* AMOUNT INPUT */}
                <div className="relative w-full text-center flex justify-center items-baseline gap-1">
                    <span className="text-3xl font-bold text-slate-300 dark:text-slate-600 translate-y-[-2px]">{currency.symbol}</span>
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
                            caret-primary tabular-nums tracking-tighter max-w-[70%]
                            text-slate-800 dark:text-white
                            ${getAmountFontSize(formState.amount)}
                            ${exactSplitStats?.isOverAllocated ? 'text-rose-500' : ''}
                        `}
                    />
                </div>

                {/* TITLE INPUT */}
                <div className="w-full max-w-sm">
                    <input 
                        type="text" 
                        placeholder="Què heu pagat?" 
                        required 
                        value={formState.title} 
                        onChange={(e) => setters.setTitle(e.target.value)} 
                        className="w-full text-center bg-transparent border-none outline-none text-base font-semibold text-slate-500 dark:text-slate-400 placeholder:text-slate-300 focus:text-slate-800 dark:focus:text-slate-200 transition-colors py-2"
                    />
                </div>
            </div>
        </div>

        {/* --- SECTION 2: SCROLLABLE CONTENT --- */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-8 bg-slate-50/50 dark:bg-slate-950">
            
            {/* GRUP 1: DETAILS */}
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {/* PAYER */}
                    <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                        <label className={labelBaseClasses + " ml-2 mt-1"}>Qui ha pagat?</label>
                        <div className="relative">
                            <select 
                                value={formState.payer} 
                                onChange={(e) => setters.setPayer(e.target.value)} 
                                className="w-full h-10 pl-3 pr-8 bg-transparent outline-none text-sm font-bold text-slate-700 dark:text-slate-200 appearance-none"
                            >
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                            <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={14} />
                        </div>
                    </div>

                    {/* DATE */}
                    <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                        <label className={labelBaseClasses + " ml-2 mt-1"}>Quan?</label>
                        <div className="relative">
                            <input 
                                type="date" 
                                value={formState.date} 
                                onChange={(e) => setters.setDate(e.target.value)} 
                                className="w-full h-10 pl-3 pr-2 bg-transparent outline-none text-sm font-bold text-slate-700 dark:text-slate-200 text-center" 
                            />
                        </div>
                    </div>
                </div>

                {/* CATEGORIES GRID */}
                <div>
                    <label className={labelBaseClasses + " mb-2 ml-1"}>Categoria</label>
                    <div className="grid grid-cols-4 gap-2">
                        {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                            const isSelected = formState.category === cat.id;
                            const colorBase = cat.color.split('-')[1]; // e.g., 'emerald' from 'text-emerald-500'
                            
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => { trigger('light'); setters.setCategory(cat.id); }}
                                    className={`
                                        flex flex-col items-center justify-center py-3 rounded-2xl transition-all duration-200 outline-none
                                        active:scale-95
                                        ${isSelected 
                                            ? `bg-${colorBase}-100 text-${colorBase}-700 ring-2 ring-${colorBase}-500/20 dark:bg-${colorBase}-900/40 dark:text-${colorBase}-300` 
                                            : 'bg-white dark:bg-slate-900 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800'
                                        }
                                    `}
                                >
                                    <cat.icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'scale-110' : 'opacity-60'}`} strokeWidth={2.5} />
                                    <span className="text-[9px] font-black uppercase tracking-tight">{cat.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* GRUP 2: SPLIT */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className={labelBaseClasses}>Com es reparteix?</label>
                    
                    {/* Feedback visual per a errors de repartiment */}
                    {formState.splitType === SPLIT_TYPES.EXACT && exactSplitStats && !exactSplitStats.isFullyAllocated && (
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse
                            ${exactSplitStats.isOverAllocated ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}
                        `}>
                            <span>{exactSplitStats.isOverAllocated ? 'Sobren' : 'Falten'}</span>
                            <span className="tabular-nums">{remainingFormatted}</span>
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
                    <SplitModeSelector currentMode={uiMode} onModeChange={(id, map) => {
                         setUiMode(id);
                         setters.setSplitType(map || (id as SplitType));
                    }} />

                    {/* USER LIST */}
                    <div className="space-y-1">
                        {users.map(u => (
                             <div key={u.id} className="flex items-center justify-between py-2 px-1">
                                 
                                 {/* User Toggle */}
                                 <div className="flex items-center gap-3 overflow-hidden flex-1">
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
                                            w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0
                                            ${formState.splitType === SPLIT_TYPES.EQUAL 
                                                ? (formState.involved.includes(u.id) 
                                                    ? 'bg-primary text-white shadow-md shadow-primary/30 scale-100' 
                                                    : 'bg-slate-100 text-transparent border border-slate-200 dark:bg-slate-800 dark:border-slate-700 scale-95')
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-xs'
                                            }
                                        `}
                                    >
                                        {formState.splitType === SPLIT_TYPES.EQUAL ? <Check size={16} strokeWidth={4} /> : u.name.charAt(0)}
                                    </button>
                                    
                                    <span 
                                        onClick={() => formState.splitType === SPLIT_TYPES.EQUAL && logic.toggleInvolved(u.id)}
                                        className={`font-bold text-sm truncate cursor-pointer select-none transition-colors ${
                                        (formState.splitType === SPLIT_TYPES.EQUAL && !formState.involved.includes(u.id)) 
                                        ? 'text-slate-300 dark:text-slate-600' 
                                        : 'text-slate-700 dark:text-slate-200'
                                    }`}>
                                        {u.name}
                                    </span>
                                 </div>
                                 
                                 {/* Inputs for Advanced Modes */}
                                 {formState.splitType !== SPLIT_TYPES.EQUAL && (
                                    <div className="flex items-center w-28 pl-2">
                                        {formState.splitType === SPLIT_TYPES.EXACT ? (
                                            <div className="relative w-full">
                                                <input 
                                                    type="text" 
                                                    inputMode="decimal"
                                                    placeholder="0" 
                                                    value={formState.splitDetails[u.id] ?? ''} 
                                                    onChange={(e) => logic.handleDetailChange(u.id, e.target.value)}
                                                    className={`
                                                        w-full h-11 px-3 text-right bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20 tabular-nums transition-colors
                                                        ${(exactSplitStats?.isOverAllocated && parseFloat(formState.splitDetails[u.id] || '0') > 0) 
                                                            ? 'border-rose-300 text-rose-600 bg-rose-50' 
                                                            : 'border-transparent focus:bg-white dark:focus:bg-slate-900'}
                                                    `}
                                                />
                                            </div>
                                        ) : (
                                            <div className="relative w-full flex items-center">
                                                <input 
                                                    type="number" 
                                                    inputMode="decimal"
                                                    min="0" placeholder="0"
                                                    step={uiMode === 'percent' ? "0.1" : "1"} 
                                                    value={formState.splitDetails[u.id] ?? ''} 
                                                    onChange={(e) => logic.handleDetailChange(u.id, e.target.value)} 
                                                    className="w-full h-11 px-3 text-center bg-slate-50 dark:bg-slate-800 border border-transparent rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white dark:focus:bg-slate-900 tabular-nums transition-all"
                                                />
                                                {uiMode === 'percent' && <span className="absolute right-3 text-slate-400 text-xs font-bold">%</span>}
                                            </div>
                                        )}
                                    </div>
                                 )}
                             </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* SPACER FOR SCROLL */}
            <div className="h-6" />
        </div>

        {/* --- SECTION 3: FOOTER --- */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0 z-20 pb-safe">
            <div className="flex items-center gap-3">
                {initialData && onDelete && (
                    <div className="flex items-center">
                        {isDeleting ? (
                            <button 
                                type="button"
                                onClick={() => initialData?.id && onDelete?.(initialData.id)}
                                className="h-14 px-4 rounded-2xl bg-rose-50 text-rose-600 font-bold text-sm border border-rose-100 whitespace-nowrap active:scale-95 transition-transform"
                            >
                                Confirmar?
                            </button>
                        ) : (
                            <button 
                                type="button" 
                                onClick={() => setIsDeleting(true)} 
                                className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors active:scale-95"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                         {isDeleting && (
                            <button 
                                type="button" 
                                onClick={() => setIsDeleting(false)}
                                className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ml-2"
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