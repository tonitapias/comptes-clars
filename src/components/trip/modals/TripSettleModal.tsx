// src/components/trip/modals/TripSettleModal.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { CheckCircle2, Smartphone, Banknote, Building2, CreditCard, LucideIcon, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Modal from '../../Modal';
import Button from '../../Button';
import HolographicTicket from '../HolographicTicket'; 
import { Settlement, TripUser, Payment } from '../../../types';
import { useTripState } from '../../../context/TripContext'; 
import { useHapticFeedback } from '../../../hooks/useHapticFeedback';
import { LITERALS } from '../../../constants/literals';

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

// [MILLORA RISC ZERO]: Blindem el modal per evitar repaints complets quan el context global muta
const TripSettleModal = React.memo(function TripSettleModal({ isOpen, onClose, settlement, onConfirm }: TripSettleModalProps) {
  const { tripData } = useTripState(); 
  const { trigger } = useHapticFeedback();
  const { t } = useTranslation();
  
  const [method, setMethod] = useState<Payment['method']>('manual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const texts = useMemo(() => ({
    title: t('MODALS.SETTLE.TITLE', LITERALS.MODALS.SETTLE.TITLE),
    methodLabel: t('MODALS.SETTLE.METHOD_LABEL', LITERALS.MODALS.SETTLE.METHOD_LABEL),
    processing: t('COMMON.PROCESSING', 'Processant...'),
    confirm: t('MODALS.SETTLE.BTN_CONFIRM', LITERALS.MODALS.SETTLE.BTN_CONFIRM),
    payment: t('COMMON.PAYMENT', 'Pagament'),
    unknownUser: t('COMMON.UNKNOWN_USER', LITERALS.COMMON.UNKNOWN_USER)
  }), [t]);

  const translatedPaymentMethods = useMemo(() => {
    return PAYMENT_METHOD_CONFIG.map(config => ({
        ...config,
        label: t(config.translationKey, config.fallback)
    }));
  }, [t]);

  // [MILLORA RISC ZERO]: Creem un "Diccionari" (Hash Map) per a cerques de cost O(1).
  // Ara, en lloc de fer un .find() que recorre tot l'array cada cop, anem directes a l'ID.
  const usersById = useMemo(() => {
    if (!tripData?.users) return {};
    return tripData.users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, TripUser>);
  }, [tripData?.users]);

  // [MILLORA RISC ZERO]: Utilitzem el diccionari per assignar usuaris instantàniament
  const { fromUser, toUser } = useMemo(() => {
    const fallbackUser = { name: texts.unknownUser, photoUrl: null } as TripUser;
    if (!settlement) return { fromUser: fallbackUser, toUser: fallbackUser };
    
    return {
      fromUser: usersById[settlement.from] || fallbackUser,
      toUser: usersById[settlement.to] || fallbackUser
    };
  }, [settlement, usersById, texts.unknownUser]);

  const handleConfirm = useCallback(async () => {
      if (isSubmitting) return; 
      
      trigger('success');
      setIsSubmitting(true);
      
      await onConfirm(method); 
      
      setIsSubmitting(false); 
  }, [isSubmitting, trigger, onConfirm, method]);

  if (!tripData || !settlement) return null;

  const currentMethodLabel = translatedPaymentMethods.find(m => m.id === method)?.label || texts.payment;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={texts.title}>
      <div className="pt-2 pb-2 space-y-6">
        
        <HolographicTicket 
          amount={settlement.amount}
          currency={tripData.currency}
          fromUser={fromUser}
          toUser={toUser}
        />

        <div className="space-y-3">
            <label 
              id="payment-method-label"
              className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-2"
            >
                {texts.methodLabel}
            </label>
            
            <div 
              className="grid grid-cols-4 gap-2" 
              role="group" 
              aria-labelledby="payment-method-label"
            >
                {translatedPaymentMethods.map((pm) => {
                    const isSelected = method === pm.id;
                    const Icon = pm.icon;
                    return (
                        <button
                            key={pm.id}
                            onClick={() => { 
                              if (!isSubmitting) {
                                trigger('selection'); 
                                setMethod(pm.id); 
                              }
                            }}
                            disabled={isSubmitting} 
                            aria-pressed={isSelected}
                            aria-label={`Seleccionar mètode de pagament: ${pm.label}`}
                            className={`
                                flex flex-col items-center justify-center gap-2 py-3 rounded-2xl border transition-all duration-200 relative overflow-hidden
                                ${isSelected 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-500/20' 
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'}
                                ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            <Icon size={20} strokeWidth={2.5} aria-hidden="true" />
                            <span className="text-[9px] font-bold uppercase">{pm.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>

        <Button 
            onClick={handleConfirm}
            fullWidth
            disabled={isSubmitting}
            icon={isSubmitting ? Loader2 : CheckCircle2}
            aria-busy={isSubmitting}
            className={`
              h-14 rounded-2xl text-sm font-black uppercase tracking-wider bg-slate-900 dark:bg-white text-white dark:text-black shadow-xl transition-all
              ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'}
            `}
        >
            {isSubmitting ? (
               <span className="animate-pulse">{texts.processing}</span>
            ) : (
               <>{texts.confirm} {currentMethodLabel}</>
            )}
        </Button>

      </div>
    </Modal>
  );
});

export default TripSettleModal;