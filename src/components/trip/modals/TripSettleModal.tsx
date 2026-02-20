import { useState } from 'react';
import { CheckCircle2, Smartphone, Banknote, Building2, CreditCard } from 'lucide-react';
// [NOU]: Importem useTranslation per introduir i18n
import { useTranslation } from 'react-i18next';
import Modal from '../../Modal';
import Button from '../../Button';
import HolographicTicket from '../HolographicTicket'; 
import { Settlement, TripUser } from '../../../types';
import { useTrip } from '../../../context/TripContext';
import { useHapticFeedback } from '../../../hooks/useHapticFeedback';
import { LITERALS } from '../../../constants/literals';

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
  
  // [NOU]: Inicialitzem el hook de traducció
  const { t } = useTranslation();

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
    // [REFACTOR]: Implementem i18n amb fallback cap als literals antics (RISC ZERO)
    <Modal isOpen={isOpen} onClose={onClose} title={t('MODALS.SETTLE.TITLE', LITERALS.MODALS.SETTLE.TITLE)}>
      <div className="pt-2 pb-2 space-y-6">
        
        <HolographicTicket 
          amount={settlement.amount}
          currency={tripData.currency}
          fromUser={fromUser}
          toUser={toUser}
        />

        <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-2">
                {/* [REFACTOR] */}
                {t('MODALS.SETTLE.METHOD_LABEL', LITERALS.MODALS.SETTLE.METHOD_LABEL)}
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

        <Button 
            onClick={handleConfirm}
            fullWidth
            icon={CheckCircle2}
            className="h-14 rounded-2xl text-sm font-black uppercase tracking-wider bg-slate-900 dark:bg-white text-white dark:text-black shadow-xl hover:scale-[1.02] active:scale-95 transition-transform"
        >
            {/* [REFACTOR] */}
            {t('MODALS.SETTLE.BTN_CONFIRM', LITERALS.MODALS.SETTLE.BTN_CONFIRM)} {currentMethodLabel}
        </Button>

      </div>
    </Modal>
  );
}