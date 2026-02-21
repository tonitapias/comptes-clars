// src/components/trip/modals/TripSettleModal.tsx
import { useState, useMemo } from 'react';
// [CANVI ZERO RISC]: Importem 'LucideIcon' de la llibreria d'icones
import { CheckCircle2, Smartphone, Banknote, Building2, CreditCard, LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Modal from '../../Modal';
import Button from '../../Button';
import HolographicTicket from '../HolographicTicket'; 
import { Settlement, TripUser, Payment } from '../../../types';
import { useTripState } from '../../../context/TripContext'; 
import { useHapticFeedback } from '../../../hooks/useHapticFeedback';
import { LITERALS } from '../../../constants/literals';

// [CANVI ZERO RISC]: Substituïm 'icon: any' per 'icon: LucideIcon'
const PAYMENT_METHOD_CONFIG: Array<{ id: Payment['method'], icon: LucideIcon, translationKey: string, fallback: string }> = [
  { id: 'manual', icon: Banknote, translationKey: 'MODALS.PAYMENT_METHODS.MANUAL', fallback: LITERALS.MODALS.PAYMENT_METHODS.MANUAL },
  { id: 'bizum', icon: Smartphone, translationKey: 'MODALS.PAYMENT_METHODS.BIZUM', fallback: LITERALS.MODALS.PAYMENT_METHODS.BIZUM },
  { id: 'transfer', icon: Building2, translationKey: 'MODALS.PAYMENT_METHODS.TRANSFER', fallback: LITERALS.MODALS.PAYMENT_METHODS.TRANSFER },
  { id: 'card', icon: CreditCard, translationKey: 'MODALS.PAYMENT_METHODS.CARD', fallback: LITERALS.MODALS.PAYMENT_METHODS.CARD },
];

interface TripSettleModalProps {
  isOpen: boolean;
  onClose: () => void;
  settlement: Settlement | null;
  onConfirm: (method: Payment['method']) => Promise<boolean>;
}

export default function TripSettleModal({ isOpen, onClose, settlement, onConfirm }: TripSettleModalProps) {
  const { tripData } = useTripState(); 
  const { trigger } = useHapticFeedback();
  
  const [method, setMethod] = useState<Payment['method']>('manual');
  
  const { t } = useTranslation();

  const translatedPaymentMethods = useMemo(() => {
    return PAYMENT_METHOD_CONFIG.map(config => ({
        ...config,
        label: t(config.translationKey, config.fallback)
    }));
  }, [t]);

  if (!tripData || !settlement) return null;

  const unknownUserText = t('COMMON.UNKNOWN_USER', LITERALS.COMMON.UNKNOWN_USER);
  const getUser = (id: string) => tripData.users.find(u => u.id === id) || { name: unknownUserText, photoUrl: null } as TripUser;
  
  const fromUser = getUser(settlement.from);
  const toUser = getUser(settlement.to);

  const handleConfirm = async () => {
      trigger('success');
      await onConfirm(method); 
  };

  const currentMethodLabel = translatedPaymentMethods.find(m => m.id === method)?.label || t('COMMON.PAYMENT', 'Pagament');

  return (
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
                {t('MODALS.SETTLE.METHOD_LABEL', LITERALS.MODALS.SETTLE.METHOD_LABEL)}
            </label>
            <div className="grid grid-cols-4 gap-2">
                {translatedPaymentMethods.map((pm) => {
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
            {t('MODALS.SETTLE.BTN_CONFIRM', LITERALS.MODALS.SETTLE.BTN_CONFIRM)} {currentMethodLabel}
        </Button>

      </div>
    </Modal>
  );
}