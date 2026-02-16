import React, { useState, useEffect, useMemo } from 'react';
import { 
  User as UserIcon, Check, Trash2, X, 
  PieChart, Percent, Calendar
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

// --- SUBCOMPONENTS ---

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
    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4 flex gap-1 border border-slate-200 dark:border-slate-700">
      {orderedModes.map((mode) => {
        const isActive = currentMode === mode.id;
        const Icon = mode.icon; 
        
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => handlePress(mode)}
            className={`
              flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
              ${isActive 
                ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }
            `}
          >
            <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
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
        // ESTRATÈGIA BLINDADA: Comprovem i capturem l'ID abans de l'acció
        if (initialData && initialData.id) {
          // Convertim a String per seguretat (per si l'ID fos numèric)
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

  const inputBaseClasses = "w-full h-11 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 font-bold text-slate-800 dark:text-slate-100 transition-all text-sm appearance-none shadow-sm";
  const labelBaseClasses = "text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-1 block";
  
  const remainingFormatted = exactSplitStats 
    ? formatMoney(toCents(Math.abs(exactSplitStats.remainderCents)), currency) 
    : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Despesa' : 'Nova Despesa'}>
      <form onSubmit={logic.handleSubmit} className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 -m-5"> 
        
        {/* --- SECTION 1: HEADER CARD (Amount & Title) --- */}
        <div className="bg-white dark:bg-slate-800 p-6 pt-8 pb-8 shadow-sm border-b border-slate-100 dark:border-slate-700 z-10 rounded-b-3xl mb-4">
            <div className="flex flex-col items-center gap-4">
                {/* AMOUNT */}
                <div className="relative w-full text-center">
                    <div className={`flex items-baseline justify-center gap-1.5 ${!formState.amount ? 'text-slate-300' : 'text-slate-800 dark:text-white'}`}>
                        <span className="text-3xl font-bold opacity-40 translate-y-[-2px]">{currency.symbol}</span>
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
                                caret-primary tabular-nums tracking-tight w-full max-w-[70%]
                                ${getAmountFontSize(formState.amount)}
                                ${exactSplitStats?.isOverAllocated ? 'text-status-error' : ''}
                            `}
                        />
                    </div>
                </div>

                {/* TITLE */}
                <div className="w-full max-w-sm px-4">
                    <input 
                        type="text" 
                        placeholder="Concepte (Ex: Sopar...)" 
                        required 
                        value={formState.title} 
                        onChange={(e) => setters.setTitle(e.target.value)} 
                        className="w-full text-center bg-slate-50 dark:bg-slate-900 border-none outline-none text-lg font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 rounded-xl py-2.5 transition-all"
                    />
                </div>
            </div>
        </div>

        {/* --- SECTION 2: SCROLL CONTENT --- */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
            
            {/* CARD: DETAILS */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className={labelBaseClasses}>Pagador</label>
                        <div className="relative">
                            <select 
                                value={formState.payer} 
                                onChange={(e) => setters.setPayer(e.target.value)} 
                                className={`${inputBaseClasses} pr-9`}
                            >
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                            <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                    </div>
                    <div>
                        <label className={labelBaseClasses}>Data</label>
                        <div className="relative">
                            <input 
                                type="date" 
                                value={formState.date} 
                                onChange={(e) => setters.setDate(e.target.value)} 
                                className={`${inputBaseClasses} text-center`} 
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none sm:hidden">
                                <Calendar size={16} className="text-slate-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* CATEGORIES */}
                <div>
                    <label className={labelBaseClasses}>Categoria</label>
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
                                        flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-200 outline-none
                                        active:scale-95 border
                                        ${isSelected 
                                            ? `bg-${colorBase}-50 border-${colorBase}-200 text-${colorBase}-600 ring-1 ring-${colorBase}-200 dark:bg-${colorBase}-900/30 dark:border-${colorBase}-800 dark:text-${colorBase}-300` 
                                            : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-500'
                                        }
                                    `}
                                >
                                    <cat.icon className={`w-6 h-6 mb-1 ${isSelected ? 'scale-110' : 'opacity-70'}`} strokeWidth={2} />
                                    <span className="text-[9px] font-bold leading-none uppercase">{cat.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* CARD: SPLIT */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                    <label className={labelBaseClasses + " mb-0"}>Repartiment</label>
                    
                    {/* Feedback Exact Split */}
                    {formState.splitType === SPLIT_TYPES.EXACT && exactSplitStats && !exactSplitStats.isFullyAllocated && (
                        <div className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1
                            ${exactSplitStats.isOverAllocated ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}
                        `}>
                            <span>{exactSplitStats.isOverAllocated ? 'Sobren' : 'Falten'}</span>
                            <span className="tabular-nums">{remainingFormatted}</span>
                        </div>
                    )}
                </div>

                <SplitModeSelector currentMode={uiMode} onModeChange={(id, map) => {
                     setUiMode(id);
                     setters.setSplitType(map || (id as SplitType));
                }} />

                {/* Users List */}
                <div className="space-y-1">
                    {users.map(u => (
                         <div key={u.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                             
                             {/* User Name & Toggle (for Equal) */}
                             <div className="flex items-center gap-3 overflow-hidden">
                                {formState.splitType === SPLIT_TYPES.EQUAL ? (
                                    <button
                                        type="button"
                                        onClick={() => { trigger('light'); logic.toggleInvolved(u.id); }}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                                            formState.involved.includes(u.id) 
                                            ? 'bg-primary border-primary text-white' 
                                            : 'bg-white border-slate-300 text-transparent'
                                        }`}
                                    >
                                        <Check size={14} strokeWidth={4} />
                                    </button>
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500">
                                        {u.name.charAt(0)}
                                    </div>
                                )}
                                <span className={`font-bold text-sm truncate ${
                                    (formState.splitType === SPLIT_TYPES.EQUAL && !formState.involved.includes(u.id)) 
                                    ? 'text-slate-400 line-through decoration-2 decoration-slate-200' 
                                    : 'text-slate-700 dark:text-slate-200'
                                }`}>
                                    {u.name}
                                </span>
                             </div>
                             
                             {/* Inputs for Non-Equal modes */}
                             {formState.splitType !== SPLIT_TYPES.EQUAL && (
                                <div className="flex items-center">
                                    {formState.splitType === SPLIT_TYPES.EXACT ? (
                                        <div className="relative w-24">
                                            <input 
                                                type="text" 
                                                inputMode="decimal"
                                                placeholder="0" 
                                                value={formState.splitDetails[u.id] ?? ''} 
                                                onChange={(e) => logic.handleDetailChange(u.id, e.target.value)}
                                                className={`w-full py-1.5 px-2 text-right bg-slate-50 dark:bg-slate-900 border rounded-md font-bold text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary tabular-nums
                                                    ${(exactSplitStats?.isOverAllocated && parseFloat(formState.splitDetails[u.id] || '0') > 0) 
                                                        ? 'border-red-300 text-red-600 bg-red-50' 
                                                        : 'border-slate-200 dark:border-slate-700'}
                                                `}
                                            />
                                            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none opacity-0 focus-within:opacity-100">€</span>
                                        </div>
                                    ) : (
                                        <div className="relative w-20">
                                            <input 
                                                type="number" 
                                                inputMode="decimal"
                                                min="0" placeholder="0"
                                                step={uiMode === 'percent' ? "0.1" : "1"} 
                                                value={formState.splitDetails[u.id] ?? ''} 
                                                onChange={(e) => logic.handleDetailChange(u.id, e.target.value)} 
                                                className="w-full py-1.5 px-2 text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md font-bold text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary tabular-nums"
                                            />
                                        </div>
                                    )}
                                </div>
                             )}
                         </div>
                    ))}
                </div>
            </div>
        </div>

        {/* --- FOOTER --- */}
        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 mt-auto rounded-t-3xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
            <div className="flex items-center gap-3">
                {initialData && onDelete && (
                    <div className="flex items-center">
                        {isDeleting ? (
                            <button 
                                type="button"
                                onClick={() => initialData?.id && onDelete?.(initialData.id)}
                                className="h-12 px-4 rounded-xl bg-red-50 text-red-600 font-bold text-sm border border-red-100 whitespace-nowrap"
                            >
                                Confirmar
                            </button>
                        ) : (
                            <button 
                                type="button" 
                                onClick={() => setIsDeleting(true)} 
                                className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                         {isDeleting && (
                            <button 
                                type="button" 
                                onClick={() => setIsDeleting(false)}
                                className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400"
                            >
                                <X size={20} />
                            </button>
                         )}
                    </div>
                )}
                
                <Button 
                    type="submit" 
                    fullWidth
                    className="h-12 text-base font-bold shadow-lg shadow-indigo-500/20" 
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