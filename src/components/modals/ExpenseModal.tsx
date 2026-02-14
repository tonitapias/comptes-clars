// src/components/modals/ExpenseModal.tsx
import React, { useState, useEffect } from 'react';
import { Calendar, User as UserIcon, CheckSquare, Square, AlertCircle, Check, Trash2 } from 'lucide-react';
import Modal from '../Modal';
import Button from '../Button';
import { CATEGORIES, UI_SPLIT_MODES, SPLIT_TYPES } from '../../utils/constants';
import { TripUser, Currency, Expense, toCents, SplitType } from '../../types';
import { ToastType } from '../Toast';
import { useExpenseForm } from '../../hooks/useExpenseForm';
import { useTrip } from '../../context/TripContext';
import { formatMoney } from '../../utils/formatters';

// --- HELPERS VISUALS ---

// FIX UX: Escalat dinàmic de la font per evitar desbordaments en xifres grans
const getAmountFontSize = (value: string) => {
  const len = value.length;
  if (len > 12) return 'text-xl';
  if (len > 9) return 'text-2xl';
  if (len > 6) return 'text-3xl';
  return 'text-4xl';
};

// --- SUBCOMPONENTS ---

interface SplitModeSelectorProps {
  currentMode: string;
  onModeChange: (modeId: string, mappedType?: SplitType) => void;
}

const SplitModeSelector: React.FC<SplitModeSelectorProps> = ({ currentMode, onModeChange }) => (
  <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl mb-4">
    {UI_SPLIT_MODES.map((mode) => (
      <button
        key={mode.id}
        type="button"
        onClick={() => onModeChange(mode.id, mode.mappedType)}
        className={`
          flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
          ${currentMode === mode.id 
            ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400 ring-1 ring-black/5 dark:ring-white/5' 
            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
          }
        `}
      >
        <mode.icon size={16} />
        <span className="hidden sm:inline">{mode.label}</span>
      </button>
    ))}
  </div>
);

interface EqualSplitSectionProps {
  users: TripUser[];
  involved: string[];
  onToggle: (id: string) => void;
}

const EqualSplitSection: React.FC<EqualSplitSectionProps> = ({ users, involved, onToggle }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
    {users.map(u => {
      const isSelected = involved.includes(u.id);
      return (
        <button
          key={u.id}
          type="button"
          onClick={() => onToggle(u.id)}
          className={`
            flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left outline-none
            focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1
            ${isSelected 
              ? 'bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-200 shadow-sm' 
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 opacity-75 hover:opacity-100'
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
);

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

  // UX State: Confirmació d'esborrat local
  const [isDeleting, setIsDeleting] = useState(false);

  const { formState, setters, logic, isSubmitting, exactSplitStats } = useExpenseForm({
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

  const [uiMode, setUiMode] = useState<string>(formState.splitType);

  useEffect(() => {
    if (formState.splitType === SPLIT_TYPES.SHARES && uiMode !== 'percent' && uiMode !== 'shares') {
       setUiMode('percent');
    } else if (formState.splitType !== SPLIT_TYPES.SHARES) {
       setUiMode(formState.splitType);
    }
  }, [formState.splitType]);

  // Reset delete state when modal closes or data changes
  useEffect(() => {
    if (!isOpen) setIsDeleting(false);
  }, [isOpen, initialData]);

  const handleModeChange = (modeId: string, mappedType?: SplitType) => {
    setUiMode(modeId);
    const targetType = mappedType || (modeId as SplitType);
    setters.setSplitType(targetType);
  };

  // 2. MILLORA UX: Validació estricta d'entrada (Només un punt/coma i màxim 2 decimals)
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const isValidFormat = /^\d*([.,]\d{0,2})?$/.test(val);

    if (isValidFormat) {
      setters.setAmount(val);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Despesa' : 'Nova Despesa'}>
      <form onSubmit={logic.handleSubmit} className="space-y-8"> 
        
        {/* --- HEADER: AMOUNT & TITLE --- */}
        <div className="space-y-5">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Import Total</label>
                <div className="relative group">
                    <input 
                        type="text" 
                        inputMode="decimal" // Força teclat numèric a iOS/Android
                        autoComplete="off"  // Evita suggeriments que tapin el teclat
                        placeholder="0.00" 
                        required 
                        autoFocus={!initialData}
                        value={formState.amount} 
                        onChange={handleAmountChange} 
                        className={`
                            w-full p-4 pl-12 font-black rounded-2xl outline-none transition-all duration-200
                            bg-slate-50 dark:bg-slate-900 
                            border-2 border-slate-100 dark:border-slate-800
                            focus:border-indigo-500 focus:bg-white dark:focus:bg-black focus:shadow-xl focus:shadow-indigo-500/10
                            placeholder:text-slate-300 dark:placeholder:text-slate-700
                            ${getAmountFontSize(formState.amount)}
                            ${exactSplitStats?.isOverAllocated ? 'border-rose-500 text-rose-600 focus:border-rose-500' : 'text-slate-900 dark:text-white'}
                        `}
                    />
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        {currency.symbol}
                    </span>
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Concepte</label>
                <input 
                    type="text" 
                    placeholder="Ex: Sopar, Taxi..." 
                    required 
                    value={formState.title} 
                    onChange={(e) => setters.setTitle(e.target.value)} 
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium text-lg transition-all"
                />
            </div>
        </div>

        {/* --- META: PAYER & DATE --- */}
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Pagador</label>
                <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                    <select 
                        value={formState.payer} 
                        onChange={(e) => setters.setPayer(e.target.value)} 
                        className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-500 appearance-none font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Data</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                    <input 
                        type="date" 
                        value={formState.date} 
                        onChange={(e) => setters.setDate(e.target.value)} 
                        className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    />
                </div>
            </div>
        </div>

        {/* --- CATEGORIES (IMPROVED A11Y) --- */}
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Categoria</label>
            {/* UX: Grid responsiva (3 cols mòbil -> 4 cols sm) */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                    const isSelected = formState.category === cat.id;
                    const colorBase = cat.color.split('-')[1];
                    
                    return (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setters.setCategory(cat.id)}
                            aria-pressed={isSelected}
                            className={`
                                relative flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200 outline-none
                                ${isSelected 
                                    ? `bg-${colorBase}-50 text-${colorBase}-700 ring-2 ring-${colorBase}-500 ring-offset-2 dark:ring-offset-slate-900 dark:bg-${colorBase}-900/30 dark:text-${colorBase}-300` 
                                    : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }
                            `}
                        >
                            {isSelected && (
                                <div className={`absolute -top-2 -right-2 bg-${colorBase}-500 text-white p-0.5 rounded-full shadow-sm`}>
                                    <Check size={12} strokeWidth={3} />
                                </div>
                            )}
                            
                            <cat.icon className={`w-6 h-6 mb-1.5 ${isSelected ? 'scale-110' : 'scale-100'}`} />
                            <span className="text-xs font-medium leading-none mt-1">{cat.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>

        {/* --- SPLIT SECTION --- */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
            <SplitModeSelector currentMode={uiMode} onModeChange={handleModeChange} />

            {formState.splitType === SPLIT_TYPES.EXACT && exactSplitStats && (
                <div className={`mb-4 p-4 rounded-2xl text-sm font-medium border flex items-center gap-3 animate-in slide-in-from-top-2
                    ${exactSplitStats.isOverAllocated 
                        ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400' 
                        : 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-300'}
                `}>
                    <AlertCircle size={20} className={exactSplitStats.isOverAllocated ? 'animate-pulse' : ''} />
                    <div className="flex-1 flex justify-between items-center">
                        <span className="font-semibold">
                            {exactSplitStats.isOverAllocated ? 'Sobren:' : exactSplitStats.isFullyAllocated ? 'Repartit:' : 'Falten:'}
                        </span>
                        <span className="font-black text-lg">
                            {formatMoney(toCents(Math.abs(exactSplitStats.remainderCents)), currency)}
                        </span>
                    </div>
                </div>
            )}

            {formState.splitType === SPLIT_TYPES.EQUAL ? (
                <EqualSplitSection users={users} involved={formState.involved} onToggle={logic.toggleInvolved} />
            ) : (
                <div className="space-y-3 mt-2">
                    {users.map(u => (
                         <div key={u.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-400">
                                    {u.name.charAt(0)}
                                </div>
                                <span className="font-bold text-slate-700 dark:text-slate-200">{u.name}</span>
                             </div>
                             
                             {formState.splitType === SPLIT_TYPES.EXACT ? (
                                <div className="relative w-32">
                                    <input 
                                        type="text" 
                                        inputMode="decimal"
                                        placeholder="0" 
                                        value={formState.splitDetails[u.id] ?? ''} 
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (/^\d*([.,]\d{0,2})?$/.test(val)) {
                                                logic.handleDetailChange(u.id, val);
                                            }
                                        }}
                                        className={`w-full p-2 pl-6 text-right bg-slate-50 dark:bg-slate-800 border rounded-xl text-base font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all
                                            ${(exactSplitStats?.isOverAllocated && (formState.splitDetails[u.id] || 0) > 0) 
                                                ? 'border-rose-200 text-rose-600' 
                                                : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'}
                                        `}
                                    />
                                    <span className="absolute left-3 top-2 text-slate-400 text-sm font-bold">{currency.symbol}</span>
                                </div>
                             ) : (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                        {uiMode === 'percent' ? '%' : 'PARTS'}
                                    </span>
                                    <input 
                                        type="number" 
                                        step={uiMode === 'percent' ? "0.1" : "1"} 
                                        min="0" placeholder="0" 
                                        value={formState.splitDetails[u.id] ?? ''} 
                                        onChange={(e) => logic.handleDetailChange(u.id, e.target.value)} 
                                        className="w-20 p-2 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                             )}
                         </div>
                    ))}
                </div>
            )}
        </div>

        {/* Footer Actions (SECURED DELETE) */}
        <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            {initialData && onDelete && (
                <div className="flex items-center">
                    {isDeleting ? (
                        <div className="flex gap-2 animate-scale-in">
                            <button 
                                type="button"
                                onClick={() => setIsDeleting(false)}
                                className="px-4 py-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel·la
                            </button>
                            <button 
                                type="button"
                                onClick={() => onDelete(initialData.id)}
                                className="px-6 py-4 rounded-xl bg-rose-600 text-white font-bold text-sm shadow-md hover:bg-rose-700 active:scale-95 transition-all"
                            >
                                Confirma
                            </button>
                        </div>
                    ) : (
                        <button 
                            type="button" 
                            onClick={() => setIsDeleting(true)} 
                            className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors border border-transparent hover:border-rose-200"
                            aria-label="Eliminar despesa"
                            title="Eliminar despesa"
                        >
                            <Trash2 size={24} />
                        </button>
                    )}
                </div>
            )}
            
            <Button 
                type="submit" 
                className="flex-1 text-lg py-4" 
                loading={isSubmitting}
                disabled={formState.splitType === SPLIT_TYPES.EXACT && exactSplitStats?.isOverAllocated}
            >
                {initialData ? 'Guardar Canvis' : 'Crear Despesa'}
            </Button>
        </div>
      </form>
    </Modal>
  );
}