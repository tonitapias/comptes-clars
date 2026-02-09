import React, { useState } from 'react';
import { ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import Modal from '../../Modal';
import Button from '../../Button';
import { formatCurrency } from '../../../utils/formatters';
import { Settlement, TripUser, Currency } from '../../../types';

interface TripSettleModalProps {
  data: Settlement | null;
  onClose: () => void;
  users: TripUser[];
  currency: Currency;
  onConfirm: (data: Settlement, method: string) => Promise<boolean>;
}

export default function TripSettleModal({ data, onClose, users, currency, onConfirm }: TripSettleModalProps) {
  const [method, setMethod] = useState('Bizum');

  if (!data) return null;

  const handleConfirm = async () => {
    const success = await onConfirm(data, method);
    if (success) onClose();
  };

  const fromUser = users.find(u => u.id === data.from)?.name;
  const toUser = users.find(u => u.id === data.to)?.name;

  return (
    <Modal isOpen={!!data} onClose={onClose} title="Confirmar Pagament">
      <div className="space-y-6 text-center">
        <div className="py-4">
          <p className="text-xl font-bold text-slate-800 dark:text-white my-2">
            {fromUser} <ArrowRightLeft className="inline mx-2"/> {toUser}
          </p>
          <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
            {formatCurrency(data.amount, currency)}
          </p>
        </div>
        
        <div className="flex justify-center gap-2 flex-wrap">
          {['Bizum', 'Efectiu', 'Transferència', 'PayPal'].map(m => (
            <button 
              key={m} 
              onClick={() => setMethod(m)} 
              className={`px-3 py-1.5 rounded-lg border-2 font-bold transition-all 
                ${method === m ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100'}`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel·lar</Button>
          <Button variant="success" onClick={handleConfirm} className="flex-1" icon={CheckCircle2}>Confirmar</Button>
        </div>
      </div>
    </Modal>
  );
}