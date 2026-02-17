import React, { useState, useEffect, useMemo } from 'react';
import { 
  User as UserIcon, Check, Trash2, X, 
  PieChart, Percent, Calendar, ChevronDown
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

// Safe Color Map to avoid Tailwind purging issues
const COLOR_MAP: Record<string, { bg: string, text: string, border: string, ring: string }> = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', ring: 'ring-emerald-500' },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-600 dark:text-blue-400',    border: 'border-blue-200 dark:border-blue-800',    ring: 'ring-blue-500' },
  violet:  { bg: 'bg-violet-50 dark:bg-violet-900/20',  text: 'text-violet-600 dark:text-violet-400',  border: 'border-violet-200 dark:border-violet-800',  ring: 'ring-violet-500' },
  pink:    { bg: 'bg-pink-50 dark:bg-pink-900/20',    text: 'text-pink-600 dark:text-pink-400',    border: 'border-pink-200 dark:border-pink-800',    ring: 'ring-pink-500' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',   text: 'text-amber-600 dark:text-amber-400',   border: 'border-amber-200 dark:border-amber-800',   ring: 'ring-amber-500' },
  orange:  { bg: 'bg-orange-50 dark:bg-orange-900/20',  text: 'text-orange-600 dark:text-orange-400',  border: 'border-orange-200 dark:border-orange-800',  ring: 'ring-orange-500' },
  teal:    { bg: 'bg-teal-50 dark:bg-teal-900/20',    text: 'text-teal-600 dark:text-teal-400',    border: 'border-teal-200 dark:border-teal-800',    ring: 'ring-teal-500' },
  cyan:    { bg: 'bg-cyan-50 dark:bg-cyan-900/20',    text: 'text-cyan-600 dark:text-cyan-400',    border: 'border-cyan-200 dark:border-cyan-800',    ring: 'ring-cyan-500' },
  slate:   { bg: 'bg-slate-50 dark:bg-slate-800',     text: 'text-slate-600 dark:text-slate-400',    border: 'border-slate-200 dark:border-slate-700',    ring: 'ring-slate-500' },
};

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
  if (len > 9) return 'text-4xl';
  if (len > 6) return 'text-5xl';
  return 'text-6xl';
};

// --- SUBCOMPONENTS ---

const SplitModeSelector: React.FC<{
  currentMode: string;
  onModeChange: (modeId: string, mappedType?: SplitType) => void;
}> = ({ currentMode, onModeChange }) => {
  const { trigger } = useHapticFeedback();

  const orderedModes = useMemo(() => VISUAL_MODE_ORDER
    .map(id => EXTENDED_MODES.find(m => m.id === id))
    .filter((m): m is ExtendedSplitMode => !!m), []);

  return (
    <div className="bg-slate-100/80 dark:bg-black/20 p-1 rounded-xl mb-4 flex gap-1 relative z-0">
      {orderedModes.map((mode) => {
        const isActive = currentMode === mode.id;
        const Icon = mode.icon; 
        
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => { trigger('light'); onModeChange(mode.id, mode.mappedType); }}
            className={`
              relative flex-1 py-2.5 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all duration-300
              ${isActive 
                ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5'
              }
            `}
          >
            <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
};

// --- MAIN COMPONENT ---

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

  // Core Business Logic (Unchanged)
  const { formState, setters, logic, isSubmitting, exactSplitStats } = useExpenseForm({
    initialData: initialData || null,
    users,
    currency,
    onSubmit: async (data) => {
      try {
        if (initialData && initialData.id) {
          await actions.updateExpense(String(initialData.id), data);
          trigger('success');
          showToast('Canvis guardats', 'success');
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

  // Sync internal UI state with Form State
  useEffect(() => {
    if (formState.splitType === SPLIT_TYPES.SHARES && uiMode !== 'percent' && uiMode !== 'shares') {
       setUiMode('shares');
    } else if (formState.splitType !== SPLIT_TYPES.SHARES) {
       setUiMode(formState.splitType);
    }
  }, [formState.splitType]);

  useEffect(() => { if (!isOpen) setIsDeleting(false); }, [isOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*([.,]\d{0,2})?$/.test(val)) setters.setAmount(val);
  };

  const remainingFormatted = exactSplitStats 
    ? formatMoney(toCents(Math.abs(exactSplitStats.remainderCents)), currency) 
    : '';

  const labelStyle = "text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block pl-1";
  const cardStyle = "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Despesa' : 'Nova Despesa'}>
      <form onSubmit={logic.handleSubmit} className="flex flex-col h-full bg-slate-50/50 dark:bg-black/20 -m-5 sm:-m-6 relative"> 
        
        {/* --- HERO SECTION: AMOUNT & TITLE --- */}
        <div className="bg-white dark:bg-slate-900 pt-2 pb-8 px-6 rounded-b-[2.5rem] shadow-sm z-10 border-b border-slate-100 dark:border-slate-800 relative overflow-hidden">
            {/* Background Pattern decoration */}
            <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                 <div className="absolute top-[-50px] right-[-50px] w-40 h-40 rounded-full bg-primary blur-3xl"></div>
                 <div className="absolute bottom-[-20px] left-[-20px] w-32 h-32 rounded-full bg-blue-500 blur-3xl"></div>
            </div>

            <div className="flex flex-col items-center gap-1 relative z-10">
                
                {/* AMOUNT */}
                <div className="relative w-full flex justify-center items-baseline gap-1 group mt-4">
                    <span className={`font-bold text-slate-300 dark:text-slate-600 transition-all duration-300 -translate-y-2 ${formState.amount ? 'text-3xl' : 'text-2xl opacity-50'}`}>
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
                            caret-primary tabular-nums tracking-tighter w-full max-w-[80%]
                            transition-all duration-200 p-0 m-0 border-none focus:ring-0
                            ${getAmountFontSize(formState.amount)}
                            ${exactSplitStats?.isOverAllocated ? 'text-rose-500' : 'text-slate-900 dark:text-white'}
                        `}
                    />
                </div>

                {/* TITLE */}
                <input 
                    type="text" 
                    placeholder="Què és aquesta despesa?" 
                    required 
                    value={formState.title} 
                    onChange={(e) => setters.setTitle(e.target.value)} 
                    className="w-full text-center bg-transparent border-none outline-none text-lg font-medium text-slate-600 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:ring-0 transition-all"
                />
            </div>
        </div>

        {/* --- SCROLLABLE FORM BODY --- */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-5 custom-scrollbar">
            
            {/* ROW: METADATA (Who & When) */}
            <div className="grid grid-cols-5 gap-3">
                <div className={`col-span-3 ${cardStyle} relative group focus-within:ring-2 focus-within:ring-primary/10 transition-all`}>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <UserIcon size={10} /> Pagador
                    </label>
                    <select 
                        value={formState.payer} 
                        onChange={(e) => setters.setPayer(e.target.value)} 
                        className="w-full bg-transparent font-bold text-slate-700 dark:text-slate-200 outline-none appearance-none cursor-pointer text-sm py-1 relative z-10"
                    >
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 bottom-4 text-slate-300 pointer-events-none" />
                </div>

                <div className={`col-span-2 ${cardStyle} relative focus-within:ring-2 focus-within:ring-primary/10 transition-all`}>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Calendar size={10} /> Data
                    </label>
                    <input 
                        type="date" 
                        value={formState.date} 
                        onChange={(e) => setters.setDate(e.target.value)} 
                        className="w-full bg-transparent font-bold text-slate-700 dark:text-slate-200 outline-none text-sm py-1 cursor-pointer" 
                    />
                </div>
            </div>

            {/* CATEGORIES */}
            <div>
                <label className={labelStyle}>Categoria</label>
                <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                        const isSelected = formState.category === cat.id;
                        const colorKey = cat.color.split('-')[1] || 'slate';
                        const styles = COLOR_MAP[colorKey] || COLOR_MAP['slate'];
                        
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => { trigger('light'); setters.setCategory(cat.id); }}
                                className={`
                                    flex flex-col items-center justify-center aspect-square rounded-2xl transition-all duration-200
                                    active:scale-95 border relative overflow-hidden
                                    ${isSelected 
                                        ? `bg-white dark:bg-slate-800 ${styles.border} shadow-md ring-2 ring-inset ${styles.ring}/20` 
                                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                    }
                                `}
                            >
                                <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors
                                    ${isSelected ? styles.bg + ' ' + styles.text : 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600'}
                                `}>
                                    <cat.icon size={18} strokeWidth={2.5} />
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-tight ${isSelected ? styles.text : 'text-slate-400'}`}>
                                    {cat.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* SPLIT SECTION */}
            <div className="pb-6">
                <div className="flex items-center justify-between mb-2 pr-1">
                    <label className={labelStyle + " !mb-0"}>Repartiment</label>
                    
                    {/* Visual Feedback for Exact/Percent Modes */}
                    {formState.splitType === SPLIT_TYPES.EXACT && exactSplitStats && !exactSplitStats.isFullyAllocated && (
                        <div className={`text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1.5 animate-pulse
                            ${exactSplitStats.isOverAllocated ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}
                        `}>
                            <span>{exactSplitStats.isOverAllocated ? 'Sobren' : 'Falten'}</span>
                            <span className="tabular-nums font-black">{remainingFormatted}</span>
                        </div>
                    )}
                </div>

                <div className={cardStyle}>
                    <SplitModeSelector currentMode={uiMode} onModeChange={(id, map) => {
                         setUiMode(id);
                         setters.setSplitType(map || (id as SplitType));
                    }} />

                    <div className="space-y-3 mt-4">
                        {users.map(u => {
                             const isIncluded = formState.involved.includes(u.id);
                             const isEqualMode = formState.splitType === SPLIT_TYPES.EQUAL;

                             return (
                             <div key={u.id} className="flex items-center justify-between gap-3 group">
                                 
                                 {/* User Toggle / Label */}
                                 <button
                                    type="button"
                                    onClick={() => { 
                                        if(isEqualMode) {
                                            trigger('light'); 
                                            logic.toggleInvolved(u.id); 
                                        }
                                    }}
                                    disabled={!isEqualMode}
                                    className={`
                                        flex items-center gap-3 flex-1 text-left transition-all rounded-xl p-1.5 -ml-1.5
                                        ${isEqualMode ? 'hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer active:scale-98' : 'cursor-default'}
                                        ${!isIncluded && isEqualMode ? 'opacity-50' : 'opacity-100'}
                                    `}
                                 >
                                    <div className={`
                                        w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 border-[2px]
                                        ${isEqualMode 
                                            ? (isIncluded
                                                ? 'bg-primary border-primary text-white shadow-md shadow-primary/20 scale-100' 
                                                : 'bg-transparent border-slate-300 dark:border-slate-600 text-transparent scale-90')
                                            : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500 font-bold text-xs'
                                        }
                                    `}>
                                        {isEqualMode 
                                            ? <Check size={16} strokeWidth={4} /> 
                                            : u.name.charAt(0)
                                        }
                                    </div>
                                    
                                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200">
                                        {u.name}
                                    </span>
                                 </button>
                                 
                                 {/* Dynamic Inputs */}
                                 {!isEqualMode && (
                                    <div className="animate-fade-in-right">
                                        {formState.splitType === SPLIT_TYPES.EXACT ? (
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    inputMode="decimal"
                                                    placeholder="0" 
                                                    value={formState.splitDetails[u.id] ?? ''} 
                                                    onChange={(e) => logic.handleDetailChange(u.id, e.target.value)}
                                                    className={`
                                                        w-28 h-12 px-3 text-right bg-slate-50 dark:bg-black/20 border-2 rounded-xl font-bold text-sm outline-none tabular-nums transition-all
                                                        focus:scale-105 focus:bg-white dark:focus:bg-slate-800
                                                        ${(exactSplitStats?.isOverAllocated && parseFloat(formState.splitDetails[u.id] || '0') > 0) 
                                                            ? 'border-rose-300 text-rose-600 focus:border-rose-500' 
                                                            : 'border-slate-100 dark:border-slate-700 focus:border-primary text-slate-700 dark:text-white'}
                                                    `}
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden h-12 w-32">
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const current = parseFloat(formState.splitDetails[u.id] || '0');
                                                        logic.handleDetailChange(u.id, Math.max(0, current - 1).toString());
                                                    }}
                                                    className="w-9 h-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-primary active:bg-slate-200 transition-colors"
                                                >
                                                    -
                                                </button>
                                                <div className="flex-1 h-full flex items-center justify-center border-x border-slate-100 dark:border-slate-800 relative bg-white dark:bg-slate-800">
                                                    <input 
                                                        type="number" 
                                                        inputMode="decimal"
                                                        min="0"
                                                        step={uiMode === 'percent' ? "0.1" : "1"} 
                                                        value={formState.splitDetails[u.id] ?? ''} 
                                                        onChange={(e) => logic.handleDetailChange(u.id, e.target.value)} 
                                                        className="w-full h-full text-center bg-transparent outline-none font-bold text-sm text-slate-800 dark:text-white p-0"
                                                    />
                                                    {uiMode === 'percent' && <span className="absolute right-1 text-[9px] font-bold text-slate-400 top-1">%</span>}
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const current = parseFloat(formState.splitDetails[u.id] || '0');
                                                        logic.handleDetailChange(u.id, (current + 1).toString());
                                                    }}
                                                    className="w-9 h-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-primary active:bg-slate-200 transition-colors"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                 )}
                             </div>
                        )})}
                    </div>
                </div>
            </div>
        </div>

        {/* --- STICKY FOOTER --- */}
        <div className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 z-50 rounded-t-2xl shadow-[0_-5px_30px_-15px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3">
                {initialData && onDelete && (
                    <div className="flex items-center transition-all duration-300">
                        {isDeleting ? (
                            <button 
                                type="button"
                                onClick={() => initialData?.id && onDelete?.(initialData.id)}
                                className="h-14 px-5 rounded-2xl bg-rose-50 text-rose-600 font-bold text-sm border border-rose-100 whitespace-nowrap active:scale-95 transition-transform shadow-sm"
                            >
                                Confirmar
                            </button>
                        ) : (
                            <button 
                                type="button" 
                                onClick={() => setIsDeleting(true)} 
                                className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all active:scale-95 active:rotate-12"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                         {isDeleting && (
                            <button 
                                type="button" 
                                onClick={() => setIsDeleting(false)}
                                className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 ml-2 hover:bg-slate-200"
                            >
                                <X size={20} />
                            </button>
                         )}
                    </div>
                )}
                
                <Button 
                    type="submit" 
                    fullWidth
                    className="h-14 text-base font-black shadow-lg shadow-primary/20 rounded-2xl tracking-wide" 
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