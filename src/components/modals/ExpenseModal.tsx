import React, { useState, useEffect, useMemo } from 'react';
import { 
  User as UserIcon, Check, Trash2, X, 
  PieChart, Percent, Calendar, ChevronDown, 
  Plus, Minus, Tag, Calculator, Wallet
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

// --- TYPES & CONSTANTS ---

// Enhanced Color Map for the immersive header background
const COLOR_MAP: Record<string, { bg: string, text: string, border: string, ring: string, indicator: string, glow: string }> = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', ring: 'ring-emerald-500', indicator: 'bg-emerald-500', glow: 'bg-emerald-400/30' },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-700 dark:text-blue-400',    border: 'border-blue-200 dark:border-blue-800',    ring: 'ring-blue-500', indicator: 'bg-blue-500', glow: 'bg-blue-400/30' },
  violet:  { bg: 'bg-violet-50 dark:bg-violet-900/20',  text: 'text-violet-700 dark:text-violet-400',  border: 'border-violet-200 dark:border-violet-800',  ring: 'ring-violet-500', indicator: 'bg-violet-500', glow: 'bg-violet-400/30' },
  pink:    { bg: 'bg-pink-50 dark:bg-pink-900/20',    text: 'text-pink-700 dark:text-pink-400',    border: 'border-pink-200 dark:border-pink-800',    ring: 'ring-pink-500', indicator: 'bg-pink-500', glow: 'bg-pink-400/30' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',   text: 'text-amber-700 dark:text-amber-400',   border: 'border-amber-200 dark:border-amber-800',   ring: 'ring-amber-500', indicator: 'bg-amber-500', glow: 'bg-amber-400/30' },
  orange:  { bg: 'bg-orange-50 dark:bg-orange-900/20',  text: 'text-orange-700 dark:text-orange-400',  border: 'border-orange-200 dark:border-orange-800',  ring: 'ring-orange-500', indicator: 'bg-orange-500', glow: 'bg-orange-400/30' },
  teal:    { bg: 'bg-teal-50 dark:bg-teal-900/20',    text: 'text-teal-700 dark:text-teal-400',    border: 'border-teal-200 dark:border-teal-800',    ring: 'ring-teal-500', indicator: 'bg-teal-500', glow: 'bg-teal-400/30' },
  cyan:    { bg: 'bg-cyan-50 dark:bg-cyan-900/20',    text: 'text-cyan-700 dark:text-cyan-400',    border: 'border-cyan-200 dark:border-cyan-800',    ring: 'ring-cyan-500', indicator: 'bg-cyan-500', glow: 'bg-cyan-400/30' },
  slate:   { bg: 'bg-slate-50 dark:bg-slate-800',     text: 'text-slate-700 dark:text-slate-400',    border: 'border-slate-200 dark:border-slate-700',    ring: 'ring-slate-500', indicator: 'bg-slate-500', glow: 'bg-slate-400/30' },
};

interface ExtendedSplitMode {
  id: string;
  label: string;
  icon: React.ElementType;
  mappedType?: SplitType;
}

const EXTENDED_MODES: ExtendedSplitMode[] = [
  ...UI_SPLIT_MODES.filter(m => m.id !== 'percent').map(m => ({ ...m, icon: m.id === 'equal' ? Check : Calculator })),
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

const MODE_ICONS: Record<string, React.ElementType> = {
  equal: UserIcon,
  exact: Tag,
  shares: PieChart,
  percent: Percent
};

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
  colorClass: string;
}> = ({ currentMode, onModeChange, colorClass }) => {
  const { trigger } = useHapticFeedback();

  const orderedModes = useMemo(() => VISUAL_MODE_ORDER
    .map(id => {
      const mode = EXTENDED_MODES.find(m => m.id === id);
      return mode ? { ...mode, icon: MODE_ICONS[id] || mode.icon } : null;
    })
    .filter((m): m is ExtendedSplitMode => !!m), []);

  return (
    <div className="bg-slate-100 dark:bg-black/40 p-1 rounded-2xl mb-6 flex relative overflow-hidden">
      {orderedModes.map((mode) => {
        const isActive = currentMode === mode.id;
        const Icon = mode.icon; 
        
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => { trigger('light'); onModeChange(mode.id, mode.mappedType); }}
            className={`
              relative flex-1 py-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all duration-300
              ${isActive 
                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm scale-100 opacity-100' 
                : 'text-slate-500 hover:bg-slate-200/50 dark:hover:bg-white/5 opacity-70'
              }
            `}
          >
            <div className={`
              p-1.5 rounded-full transition-colors duration-300
              ${isActive ? `${colorClass} bg-opacity-10 dark:bg-opacity-20` : 'bg-transparent'}
            `}>
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? '' : 'text-slate-400'} />
            </div>
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

  const { formState, setters, logic, isSubmitting, exactSplitStats } = useExpenseForm({
    initialData: initialData || null,
    users,
    currency,
    onSubmit: async (data) => {
      try {
        const expensePayload = data as unknown as Omit<Expense, 'id'>;
        if (initialData && initialData.id) {
          await actions.updateExpense(String(initialData.id), expensePayload);
          trigger('success');
          showToast('Canvis guardats', 'success');
        } else {
          await actions.addExpense(expensePayload);
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

  useEffect(() => { if (!isOpen) setIsDeleting(false); }, [isOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*([.,]\d{0,2})?$/.test(val)) setters.setAmount(val);
  };

  const remainingFormatted = exactSplitStats 
    ? formatMoney(toCents(Math.abs(exactSplitStats.remainderCents)), currency) 
    : '';

  const labelStyle = "text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 block pl-1";

  const activeCategoryColor = useMemo(() => {
    const cat = CATEGORIES.find(c => c.id === formState.category);
    const colorKey = cat?.color.split('-')[1] || 'slate';
    return COLOR_MAP[colorKey] || COLOR_MAP['slate'];
  }, [formState.category]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Despesa' : 'Nova Despesa'}>
      <form onSubmit={logic.handleSubmit} className="flex flex-col h-full bg-slate-50 dark:bg-black -m-5 sm:-m-6 relative overflow-hidden"> 
        
        {/* --- IMMERSIVE FINANCIAL HEADER --- */}
        <div className="relative pt-8 pb-10 px-6 bg-white dark:bg-slate-900 rounded-b-[2.5rem] shadow-xl z-20 overflow-hidden shrink-0 transition-colors duration-500">
            
            {/* Aurora Background Effect */}
            <div className={`absolute top-[-50%] left-[-20%] w-[140%] h-[200%] ${activeCategoryColor.glow} blur-[80px] opacity-40 rounded-full pointer-events-none transition-colors duration-700 animate-pulse`}></div>
            <div className={`absolute bottom-[-20%] right-[-20%] w-[100%] h-[150%] ${activeCategoryColor.glow} blur-[60px] opacity-20 rounded-full pointer-events-none transition-colors duration-700`}></div>

            <div className="relative z-10 flex flex-col items-center">
                {/* AMOUNT INPUT */}
                <div className="flex items-baseline justify-center gap-1 w-full mb-2">
                    <span className={`font-bold text-slate-400 dark:text-slate-600 transition-all duration-300 -translate-y-[15%] text-3xl`}>
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
                            placeholder:text-slate-200 dark:placeholder:text-slate-800
                            caret-slate-400 tabular-nums tracking-tighter w-full max-w-[85%]
                            transition-all duration-300 p-0 m-0 border-none focus:ring-0
                            ${getAmountFontSize(formState.amount)}
                            ${exactSplitStats?.isOverAllocated ? 'text-rose-500' : 'text-slate-900 dark:text-white'}
                        `}
                    />
                </div>
                
                {/* TITLE INPUT */}
                <input 
                    type="text" 
                    placeholder="Què és aquesta despesa?" 
                    required 
                    value={formState.title} 
                    onChange={(e) => setters.setTitle(e.target.value)} 
                    className="w-full text-center bg-transparent border-none focus:ring-0 outline-none text-xl font-medium text-slate-600 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-700 transition-all py-1 px-4"
                />
            </div>
        </div>

        {/* --- SCROLLABLE CONTENT --- */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 pt-6 pb-32 space-y-8 custom-scrollbar">
            
            {/* WHO & WHEN */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Wallet size={12} /> Pagador
                    </label>
                    <div className="relative">
                      <select 
                          value={formState.payer} 
                          onChange={(e) => setters.setPayer(e.target.value)} 
                          className="w-full bg-transparent font-bold text-slate-700 dark:text-slate-200 outline-none appearance-none cursor-pointer text-sm py-1 pr-4"
                      >
                          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Calendar size={12} /> Data
                    </label>
                    <input 
                        type="date" 
                        value={formState.date} 
                        onChange={(e) => setters.setDate(e.target.value)} 
                        className="w-full bg-transparent font-bold text-slate-700 dark:text-slate-200 outline-none text-sm py-1 cursor-pointer" 
                    />
                </div>
            </div>

            {/* CATEGORIES GRID */}
            <div>
                <label className={labelStyle}>Categoria</label>
                <div className="grid grid-cols-4 gap-3">
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
                                    flex flex-col items-center justify-center aspect-[4/3] rounded-2xl transition-all duration-300
                                    relative overflow-hidden group border
                                    ${isSelected 
                                        ? `bg-white dark:bg-slate-800 ${styles.border} shadow-md ring-1 ring-inset ${styles.ring} scale-[1.02]` 
                                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                                    }
                                `}
                            >
                                <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-colors duration-300
                                    ${isSelected ? styles.bg + ' ' + styles.text : 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600'}
                                `}>
                                    <cat.icon size={16} strokeWidth={2.5} />
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-tight ${isSelected ? styles.text : 'text-slate-400'}`}>
                                    {cat.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* SPLIT SECTION */}
            <div>
                <div className="flex items-center justify-between mb-2 pr-1">
                    <label className={labelStyle + " !mb-0"}>Repartiment</label>
                    
                    {formState.splitType === SPLIT_TYPES.EXACT && exactSplitStats && !exactSplitStats.isFullyAllocated && (
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5 animate-pulse
                            ${exactSplitStats.isOverAllocated ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}
                        `}>
                            <span>{exactSplitStats.isOverAllocated ? 'Sobren' : 'Falten'}</span>
                            <span className="tabular-nums font-black">{remainingFormatted}</span>
                        </div>
                    )}
                </div>

                <SplitModeSelector 
                    currentMode={uiMode} 
                    onModeChange={(id, map) => {
                         setUiMode(id);
                         setters.setSplitType(map || (id as SplitType));
                    }} 
                    colorClass={activeCategoryColor.text}
                />

                <div className="space-y-2">
                    {users.map(u => {
                            const isIncluded = formState.involved.includes(u.id);
                            const isEqualMode = formState.splitType === SPLIT_TYPES.EQUAL;

                            return (
                            <div key={u.id} className={`
                                flex items-center justify-between gap-3 p-3 rounded-2xl transition-all duration-300 border
                                ${isEqualMode && isIncluded ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm' : 'bg-transparent border-transparent'}
                            `}>
                                
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
                                    flex items-center gap-3 flex-1 text-left transition-all
                                    ${isEqualMode ? 'cursor-pointer active:scale-98' : 'cursor-default'}
                                    ${!isIncluded && isEqualMode ? 'opacity-40 grayscale' : 'opacity-100'}
                                `}
                                >
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 border-[2px] shadow-sm
                                    ${isEqualMode 
                                        ? (isIncluded
                                            ? `${activeCategoryColor.bg} ${activeCategoryColor.border} ${activeCategoryColor.text}` 
                                            : 'bg-transparent border-slate-200 dark:border-slate-700 text-transparent')
                                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs'
                                    }
                                `}>
                                    {isEqualMode 
                                        ? <Check size={16} strokeWidth={4} /> 
                                        : u.name.charAt(0)
                                    }
                                </div>
                                
                                <span className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">
                                    {u.name}
                                </span>
                                </button>
                                
                                {/* Manual Inputs */}
                                {!isEqualMode && (
                                <div className="animate-fade-in pl-2">
                                    {formState.splitType === SPLIT_TYPES.EXACT ? (
                                        <div className="relative group">
                                            <input 
                                                type="text" 
                                                inputMode="decimal"
                                                placeholder="0" 
                                                value={formState.splitDetails[u.id] ?? ''} 
                                                onChange={(e) => logic.handleDetailChange(u.id, e.target.value)}
                                                className={`
                                                    w-28 h-10 px-3 text-right bg-slate-50 dark:bg-black/40 border rounded-xl font-bold text-sm outline-none tabular-nums transition-all
                                                    focus:w-32 focus:bg-white dark:focus:bg-slate-800 focus:shadow-md
                                                    ${(exactSplitStats?.isOverAllocated && parseFloat(formState.splitDetails[u.id] || '0') > 0) 
                                                        ? 'border-rose-300 text-rose-600 focus:border-rose-500' 
                                                        : 'border-slate-200 dark:border-slate-800 focus:border-slate-300 text-slate-700 dark:text-white'}
                                                `}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden h-10 shadow-sm">
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    trigger('selection');
                                                    const current = parseFloat(formState.splitDetails[u.id] || '0');
                                                    logic.handleDetailChange(u.id, Math.max(0, current - 1).toString());
                                                }}
                                                className="w-10 h-full flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-rose-500 active:bg-slate-100 transition-colors"
                                            >
                                                <Minus size={14} strokeWidth={3} />
                                            </button>
                                            <div className="w-14 h-full flex items-center justify-center border-x border-slate-100 dark:border-slate-800 relative bg-slate-50/50 dark:bg-white/5">
                                                <input 
                                                    type="number" 
                                                    inputMode="decimal"
                                                    min="0"
                                                    step={uiMode === 'percent' ? "0.1" : "1"} 
                                                    value={formState.splitDetails[u.id] ?? ''} 
                                                    onChange={(e) => logic.handleDetailChange(u.id, e.target.value)} 
                                                    className="w-full h-full text-center bg-transparent outline-none font-black text-sm text-slate-800 dark:text-white p-0"
                                                />
                                                {uiMode === 'percent' && <span className="absolute right-1 text-[9px] font-bold text-slate-400 top-1">%</span>}
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    trigger('selection');
                                                    const current = parseFloat(formState.splitDetails[u.id] || '0');
                                                    logic.handleDetailChange(u.id, (current + 1).toString());
                                                }}
                                                className="w-10 h-full flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-500 active:bg-slate-100 transition-colors"
                                            >
                                                <Plus size={14} strokeWidth={3} />
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

        {/* --- STICKY FOOTER --- */}
        <div className="absolute bottom-0 left-0 w-full px-6 pb-6 pt-12 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-black dark:via-black/95 z-30 pointer-events-none flex justify-center items-end">
            <div className="flex items-center gap-3 w-full pointer-events-auto max-w-md">
                {initialData && onDelete && (
                    <div className="flex items-center transition-all duration-300">
                        {isDeleting ? (
                            <button 
                                type="button"
                                onClick={() => initialData?.id && onDelete?.(initialData.id)}
                                className="h-14 px-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold text-sm border border-rose-100 dark:border-rose-800 whitespace-nowrap active:scale-95 transition-all shadow-lg shadow-rose-500/10"
                            >
                                Confirmar
                            </button>
                        ) : (
                            <button 
                                type="button" 
                                onClick={() => setIsDeleting(true)} 
                                className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-900 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 border border-slate-200 dark:border-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200/50 dark:shadow-none"
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
                    className="h-14 text-base font-black shadow-xl shadow-primary/30 rounded-2xl tracking-wide transform transition-all active:scale-98" 
                    loading={isSubmitting}
                    haptic="success"
                    disabled={formState.splitType === SPLIT_TYPES.EXACT && exactSplitStats?.isOverAllocated}
                >
                    {initialData ? 'Guardar' : 'Crear Despesa'}
                </Button>
            </div>
        </div>
      </form>
    </Modal>
  );
}