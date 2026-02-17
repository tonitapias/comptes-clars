import React, { useState, useEffect, useMemo } from 'react';
import { 
  User as UserIcon, Check, Trash2, X, 
  PieChart, Percent, Calendar, ChevronDown, 
  Plus, Minus, Tag, Calculator
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

// Refined Color Map for better dark mode contrast & a11y
const COLOR_MAP: Record<string, { bg: string, text: string, border: string, ring: string, indicator: string }> = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-700', ring: 'ring-emerald-500', indicator: 'bg-emerald-500' },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/30',    text: 'text-blue-700 dark:text-blue-400',    border: 'border-blue-200 dark:border-blue-700',    ring: 'ring-blue-500', indicator: 'bg-blue-500' },
  violet:  { bg: 'bg-violet-50 dark:bg-violet-900/30',  text: 'text-violet-700 dark:text-violet-400',  border: 'border-violet-200 dark:border-violet-700',  ring: 'ring-violet-500', indicator: 'bg-violet-500' },
  pink:    { bg: 'bg-pink-50 dark:bg-pink-900/30',    text: 'text-pink-700 dark:text-pink-400',    border: 'border-pink-200 dark:border-pink-700',    ring: 'ring-pink-500', indicator: 'bg-pink-500' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-900/30',   text: 'text-amber-700 dark:text-amber-400',   border: 'border-amber-200 dark:border-amber-700',   ring: 'ring-amber-500', indicator: 'bg-amber-500' },
  orange:  { bg: 'bg-orange-50 dark:bg-orange-900/30',  text: 'text-orange-700 dark:text-orange-400',  border: 'border-orange-200 dark:border-orange-700',  ring: 'ring-orange-500', indicator: 'bg-orange-500' },
  teal:    { bg: 'bg-teal-50 dark:bg-teal-900/30',    text: 'text-teal-700 dark:text-teal-400',    border: 'border-teal-200 dark:border-teal-700',    ring: 'ring-teal-500', indicator: 'bg-teal-500' },
  cyan:    { bg: 'bg-cyan-50 dark:bg-cyan-900/30',    text: 'text-cyan-700 dark:text-cyan-400',    border: 'border-cyan-200 dark:border-cyan-700',    ring: 'ring-cyan-500', indicator: 'bg-cyan-500' },
  slate:   { bg: 'bg-slate-50 dark:bg-slate-800',     text: 'text-slate-700 dark:text-slate-400',    border: 'border-slate-200 dark:border-slate-700',    ring: 'ring-slate-500', indicator: 'bg-slate-500' },
};

interface ExtendedSplitMode {
  id: string;
  label: string;
  icon: React.ElementType;
  mappedType?: SplitType;
}

const EXTENDED_MODES: ExtendedSplitMode[] = [
  ...UI_SPLIT_MODES.filter(m => m.id !== 'percent').map(m => ({ ...m, icon: m.id === 'equal' ? Check : Calculator })), // Mapping basic icons if needed
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

// Fix icons for standard modes
const MODE_ICONS: Record<string, React.ElementType> = {
  equal: UserIcon,
  exact: Tag,
  shares: PieChart,
  percent: Percent
};

const VISUAL_MODE_ORDER = ['equal', 'exact', 'shares', 'percent'];

const getAmountFontSize = (value: string) => {
  const len = value.length;
  if (len > 10) return 'text-3xl';
  if (len > 7) return 'text-4xl';
  return 'text-5xl'; // Started slightly smaller than 6xl for mobile safety
};

// --- SUBCOMPONENTS ---

const SplitModeSelector: React.FC<{
  currentMode: string;
  onModeChange: (modeId: string, mappedType?: SplitType) => void;
}> = ({ currentMode, onModeChange }) => {
  const { trigger } = useHapticFeedback();

  const orderedModes = useMemo(() => VISUAL_MODE_ORDER
    .map(id => {
      const mode = EXTENDED_MODES.find(m => m.id === id);
      return mode ? { ...mode, icon: MODE_ICONS[id] || mode.icon } : null;
    })
    .filter((m): m is ExtendedSplitMode => !!m), []);

  return (
    <div className="bg-slate-100/80 dark:bg-slate-900/50 p-1.5 rounded-2xl mb-6 flex gap-1 relative overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
      {orderedModes.map((mode) => {
        const isActive = currentMode === mode.id;
        const Icon = mode.icon; 
        
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => { trigger('light'); onModeChange(mode.id, mode.mappedType); }}
            className={`
              relative flex-1 py-3 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-300
              ${isActive 
                ? 'bg-white dark:bg-slate-800 text-primary dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10 translate-y-0' 
                : 'text-slate-500 dark:text-slate-500 hover:bg-white/40 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-slate-300'
              }
            `}
          >
            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
            <span className="tracking-wide">{mode.label}</span>
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

  // Core Business Logic
  const { formState, setters, logic, isSubmitting, exactSplitStats } = useExpenseForm({
    initialData: initialData || null,
    users,
    currency,
    onSubmit: async (data) => {
      try {
        // CORRECCIÓ: Cast explícit per satisfer el tipus 'MoneyCents' (branded number) que esperen les accions
        // 'data.amount' ja són cèntims gràcies a la validació Zod, només cal el 'segell' de tipus.
        const expensePayload = data as unknown as Omit<Expense, 'id'>;

        if (initialData && initialData.id) {
          // Per update, Partial<Expense> és suficient
          await actions.updateExpense(String(initialData.id), expensePayload);
          trigger('success');
          showToast('Canvis guardats', 'success');
        } else {
          // Per add, necessitem l'objecte complet (menys ID)
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
    // Regex allows digits and one decimal separator (dot or comma)
    if (/^\d*([.,]\d{0,2})?$/.test(val)) setters.setAmount(val);
  };

  const remainingFormatted = exactSplitStats 
    ? formatMoney(toCents(Math.abs(exactSplitStats.remainderCents)), currency) 
    : '';

  const labelStyle = "text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5 block px-1";

  // Dynamic Color Theme based on Category
  const activeCategoryColor = useMemo(() => {
    const cat = CATEGORIES.find(c => c.id === formState.category);
    const colorKey = cat?.color.split('-')[1] || 'slate';
    return COLOR_MAP[colorKey] || COLOR_MAP['slate'];
  }, [formState.category]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Despesa' : 'Nova Despesa'}>
      <form onSubmit={logic.handleSubmit} className="flex flex-col h-full bg-slate-50/50 dark:bg-black/20 -m-5 sm:-m-6 relative"> 
        
        {/* --- HERO SECTION: FINANCIAL CARD --- */}
        <div className="bg-white dark:bg-slate-900 pt-6 pb-8 px-6 rounded-b-[2rem] shadow-financial-sm z-20 relative overflow-hidden transition-colors duration-500">
            
            {/* Ambient Glow */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-3/4 ${activeCategoryColor.bg} blur-[60px] opacity-40 rounded-full pointer-events-none transition-colors duration-500`}></div>

            <div className="flex flex-col items-center gap-4 relative z-10">
                {/* AMOUNT INPUT GROUP */}
                <div className="flex flex-col items-center w-full">
                  <div className="relative flex justify-center items-baseline gap-1 group">
                      <span className={`font-bold text-slate-400 dark:text-slate-600 transition-all duration-300 -translate-y-[10%] ${formState.amount ? 'text-3xl' : 'text-2xl opacity-50'}`}>
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
                              caret-primary tabular-nums tracking-tight w-full max-w-[85%]
                              transition-all duration-200 p-0 m-0 border-none focus:ring-0
                              ${getAmountFontSize(formState.amount)}
                              ${exactSplitStats?.isOverAllocated ? 'text-rose-500' : 'text-slate-900 dark:text-white'}
                          `}
                      />
                  </div>
                  
                  {/* TITLE INPUT */}
                  <div className="w-full max-w-xs relative mt-2">
                    <input 
                        type="text" 
                        placeholder="Concepte (Ex: Sopar)" 
                        required 
                        value={formState.title} 
                        onChange={(e) => setters.setTitle(e.target.value)} 
                        className="w-full text-center bg-transparent border-b-2 border-slate-100 dark:border-slate-800 focus:border-primary/50 outline-none text-lg font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:ring-0 transition-all py-2"
                    />
                  </div>
                </div>
            </div>
        </div>

        {/* --- SCROLLABLE FORM BODY --- */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-8 custom-scrollbar relative z-10">
            
            {/* ROW: METADATA (Who & When) */}
            <div className="flex gap-3">
                <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 shadow-sm relative focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                        <UserIcon size={10} /> Pagador
                    </label>
                    <div className="relative">
                      <select 
                          value={formState.payer} 
                          onChange={(e) => setters.setPayer(e.target.value)} 
                          className="w-full bg-transparent font-bold text-slate-700 dark:text-slate-200 outline-none appearance-none cursor-pointer text-sm py-1.5 pr-6 relative z-10"
                      >
                          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                    </div>
                </div>

                <div className="w-2/5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 shadow-sm relative focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                        <Calendar size={10} /> Data
                    </label>
                    <input 
                        type="date" 
                        value={formState.date} 
                        onChange={(e) => setters.setDate(e.target.value)} 
                        className="w-full bg-transparent font-bold text-slate-700 dark:text-slate-200 outline-none text-sm py-1.5 cursor-pointer" 
                    />
                </div>
            </div>

            {/* CATEGORIES */}
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
                                    flex flex-col items-center justify-center aspect-square rounded-2xl transition-all duration-200
                                    active:scale-95 border relative overflow-hidden group
                                    ${isSelected 
                                        ? `bg-white dark:bg-slate-800 ${styles.border} shadow-md ring-2 ring-inset ${styles.ring}/30 scale-[1.02]` 
                                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                                    }
                                `}
                            >
                                <div className={`
                                    w-9 h-9 rounded-full flex items-center justify-center mb-1.5 transition-colors
                                    ${isSelected ? styles.bg + ' ' + styles.text : 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 group-hover:bg-slate-100 dark:group-hover:bg-slate-700'}
                                `}>
                                    <cat.icon size={18} strokeWidth={2.5} />
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-tight truncate w-full px-1 ${isSelected ? styles.text : 'text-slate-400'}`}>
                                    {cat.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* SPLIT SECTION */}
            <div className="pb-24">
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

                <SplitModeSelector currentMode={uiMode} onModeChange={(id, map) => {
                         setUiMode(id);
                         setters.setSplitType(map || (id as SplitType));
                }} />

                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-2 shadow-sm">
                    <div className="space-y-1">
                        {users.map(u => {
                             const isIncluded = formState.involved.includes(u.id);
                             const isEqualMode = formState.splitType === SPLIT_TYPES.EQUAL;

                             return (
                             <div key={u.id} className="flex items-center justify-between gap-3 p-2 rounded-2xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                 
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
                                        flex items-center gap-3 flex-1 text-left transition-all
                                        ${isEqualMode ? 'cursor-pointer active:scale-98' : 'cursor-default'}
                                        ${!isIncluded && isEqualMode ? 'opacity-50 grayscale' : 'opacity-100'}
                                    `}
                                 >
                                    <div className={`
                                        w-11 h-11 rounded-full flex items-center justify-center transition-all flex-shrink-0 border-[2px] shadow-sm
                                        ${isEqualMode 
                                            ? (isIncluded
                                                ? 'bg-primary border-primary text-white scale-100' 
                                                : 'bg-transparent border-slate-200 dark:border-slate-700 text-transparent scale-90')
                                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm'
                                        }
                                    `}>
                                        {isEqualMode 
                                            ? <Check size={18} strokeWidth={4} /> 
                                            : u.name.charAt(0)
                                        }
                                    </div>
                                    
                                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">
                                        {u.name}
                                    </span>
                                 </button>
                                 
                                 {/* Dynamic Inputs for Manual Modes */}
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
                                                        w-32 h-12 px-4 text-right bg-slate-50 dark:bg-black/40 border-2 rounded-xl font-bold text-sm outline-none tabular-nums transition-all
                                                        focus:scale-105 focus:bg-white dark:focus:bg-slate-800
                                                        ${(exactSplitStats?.isOverAllocated && parseFloat(formState.splitDetails[u.id] || '0') > 0) 
                                                            ? 'border-rose-300 text-rose-600 focus:border-rose-500' 
                                                            : 'border-slate-100 dark:border-slate-700 focus:border-primary text-slate-700 dark:text-white'}
                                                    `}
                                                />
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-300 pointer-events-none">
                                                  {currency.symbol}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center bg-slate-50 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden h-12 w-36 shadow-sm">
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        trigger('selection');
                                                        const current = parseFloat(formState.splitDetails[u.id] || '0');
                                                        logic.handleDetailChange(u.id, Math.max(0, current - 1).toString());
                                                    }}
                                                    className="w-10 h-full flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-rose-500 active:bg-slate-300 transition-colors"
                                                >
                                                    <Minus size={16} strokeWidth={3} />
                                                </button>
                                                <div className="flex-1 h-full flex items-center justify-center border-x border-slate-100 dark:border-slate-800 relative bg-white dark:bg-slate-800/50">
                                                    <input 
                                                        type="number" 
                                                        inputMode="decimal"
                                                        min="0"
                                                        step={uiMode === 'percent' ? "0.1" : "1"} 
                                                        value={formState.splitDetails[u.id] ?? ''} 
                                                        onChange={(e) => logic.handleDetailChange(u.id, e.target.value)} 
                                                        className="w-full h-full text-center bg-transparent outline-none font-black text-sm text-slate-800 dark:text-white p-0"
                                                    />
                                                    {uiMode === 'percent' && <span className="absolute right-1 text-[9px] font-bold text-slate-400 top-1.5">%</span>}
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        trigger('selection');
                                                        const current = parseFloat(formState.splitDetails[u.id] || '0');
                                                        logic.handleDetailChange(u.id, (current + 1).toString());
                                                    }}
                                                    className="w-10 h-full flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-emerald-500 active:bg-slate-300 transition-colors"
                                                >
                                                    <Plus size={16} strokeWidth={3} />
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
        <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-slate-900 dark:via-slate-900/95 z-30 pointer-events-none flex justify-center items-end h-32">
            <div className="flex items-center gap-3 w-full pointer-events-auto max-w-md">
                {initialData && onDelete && (
                    <div className="flex items-center transition-all duration-300">
                        {isDeleting ? (
                            <button 
                                type="button"
                                onClick={() => initialData?.id && onDelete?.(initialData.id)}
                                className="h-14 px-5 rounded-2xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold text-sm border border-rose-100 dark:border-rose-800 whitespace-nowrap active:scale-95 transition-transform shadow-lg shadow-rose-500/10"
                            >
                                Confirmar
                            </button>
                        ) : (
                            <button 
                                type="button" 
                                onClick={() => setIsDeleting(true)} 
                                className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 border border-slate-100 dark:border-slate-700 hover:border-rose-100 transition-all active:scale-95 shadow-lg shadow-slate-200/50 dark:shadow-none"
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
                    {initialData ? 'Guardar Canvis' : 'Crear Despesa'}
                </Button>
            </div>
        </div>
      </form>
    </Modal>
  );
}