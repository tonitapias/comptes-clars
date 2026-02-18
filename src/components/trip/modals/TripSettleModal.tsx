import { useState } from 'react';
import { CheckCircle2, ArrowRight, Smartphone, Banknote, Building2, CreditCard } from 'lucide-react';
import Modal from '../../Modal';
import Button from '../../Button';
import Avatar from '../../Avatar';
import { Settlement, TripUser } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';
import { useTrip } from '../../../context/TripContext';
import { useHapticFeedback } from '../../../hooks/useHapticFeedback';
import { LITERALS } from '../../../constants/literals'; // IMPORT NOU

// --- CONFIGURACIÓ ESTÀTICA ---
// Ara els textos venen del fitxer centralitzat
const PAYMENT_METHODS = [
  { id: 'manual', label: LITERALS.MODALS.PAYMENT_METHODS.MANUAL, icon: Banknote },
  { id: 'bizum', label: LITERALS.MODALS.PAYMENT_METHODS.BIZUM, icon: Smartphone },
  { id: 'transfer', label: LITERALS.MODALS.PAYMENT_METHODS.TRANSFER, icon: Building2 },
  { id: 'card', label: LITERALS.MODALS.PAYMENT_METHODS.CARD, icon: CreditCard },
];

interface TripSettleModalProps {
  isOpen: boolean;
  onClose: () => void;
  settlement: Settlement | null;
  onConfirm: (method: string) => Promise<boolean>;
}

export default function TripSettleModal({ isOpen, onClose, settlement, onConfirm }: TripSettleModalProps) {
  const { tripData } = useTrip();
  const { trigger } = useHapticFeedback();
  const [method, setMethod] = useState<string>('manual');

  if (!tripData || !settlement) return null;

  const getUser = (id: string) => tripData.users.find(u => u.id === id) || { name: LITERALS.COMMON.UNKNOWN_USER, photoUrl: null } as TripUser;
  
  const fromUser = getUser(settlement.from);
  const toUser = getUser(settlement.to);

  const handleConfirm = async () => {
      trigger('success');
      await onConfirm(method); 
  };

  const currentMethodLabel = PAYMENT_METHODS.find(m => m.id === method)?.label || 'Pagament';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={LITERALS.MODALS.SETTLE.TITLE}>
      <div className="pt-2 pb-2 space-y-6">
        
        {/* --- HOLOGRAPHIC TICKET --- */}
        <div className="relative mx-1 group perspective">
            <div className="absolute top-[60%] -left-3 w-6 h-6 bg-slate-50 dark:bg-[#000000] rounded-full z-20" />
            <div className="absolute top-[60%] -right-3 w-6 h-6 bg-slate-50 dark:bg-[#000000] rounded-full z-20" />
            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-[2rem] opacity-50 group-hover:opacity-70 transition-opacity" />

            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-0 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden transform transition-transform duration-500 hover:scale-[1.01]">
                
                <div className="h-28 bg-gradient-to-br from-indigo-600 to-purple-600 relative overflow-hidden flex flex-col items-center justify-center text-white">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" />
                    <span className="relative z-10 text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">
                        {LITERALS.MODALS.SETTLE.TOTAL_LABEL}
                    </span>
                    <h2 className="relative z-10 text-4xl font-black tracking-tighter drop-shadow-md">
                        {formatCurrency(settlement.amount, tripData.currency)}
                    </h2>
                </div>

                <div className="p-6 pt-6 relative">
                    <div className="flex items-center justify-between relative z-10 mb-6">
                        <div className="flex flex-col items-center gap-2 w-20">
                            <Avatar name={fromUser.name} photoUrl={fromUser.photoUrl} size="md" className="grayscale" />
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate w-full text-center">{fromUser.name}</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 px-2">
                             <div className="flex gap-1 mb-1">
                                <span className="w-1 h-1 rounded-full bg-indigo-500 animate-ping" />
                                <span className="w-1 h-1 rounded-full bg-indigo-400" />
                                <span className="w-1 h-1 rounded-full bg-indigo-300" />
                             </div>
                             <ArrowRight size={20} className="text-indigo-500" />
                        </div>
                        <div className="flex flex-col items-center gap-2 w-20">
                            <Avatar name={toUser.name} photoUrl={toUser.photoUrl} size="md" />
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 truncate w-full text-center">{toUser.name}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- PAYMENT METHOD SELECTOR --- */}
        <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-2">
                {LITERALS.MODALS.SETTLE.METHOD_LABEL}
            </label>
            <div className="grid grid-cols-4 gap-2">
                {PAYMENT_METHODS.map((pm) => {
                    const isSelected = method === pm.id;
                    const Icon = pm.icon;
                    return (
                        <button
                            key={pm.id}
                            onClick={() => { trigger('selection'); setMethod(pm.id); }}
                            className={`
                                flex flex-col items-center justify-center gap-2 py-3 rounded-2xl border transition-all duration-200 relative overflow-hidden
                                ${isSelected 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-500/20' 
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'}
                            `}
                        >
                            <Icon size={20} strokeWidth={2.5} />
                            <span className="text-[9px] font-bold uppercase">{pm.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>

        {/* --- ACTION BUTTON --- */}
        <Button 
            onClick={handleConfirm}
            fullWidth
            icon={CheckCircle2}
            className="h-14 rounded-2xl text-sm font-black uppercase tracking-wider bg-slate-900 dark:bg-white text-white dark:text-black shadow-xl hover:scale-[1.02] active:scale-95 transition-transform"
        >
            {LITERALS.MODALS.SETTLE.BTN_CONFIRM} {currentMethodLabel}
        </Button>

      </div>
    </Modal>
  );
}