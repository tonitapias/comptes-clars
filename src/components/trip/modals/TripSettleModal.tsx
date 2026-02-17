import { useState } from 'react';
import { ArrowRight, CheckCircle2, Wallet, Banknote, Landmark, Smartphone } from 'lucide-react';
import Modal from '../../Modal';
import Button from '../../Button';
import Avatar from '../../Avatar';
import { formatCurrency } from '../../../utils/formatters';
import { Settlement, TripUser, Currency } from '../../../types';

interface TripSettleModalProps {
  data: Settlement | null;
  onClose: () => void;
  users: TripUser[];
  currency: Currency;
  onConfirm: (data: Settlement, method: string) => Promise<boolean>;
}

const PAYMENT_METHODS = [
  { id: 'Bizum', icon: Smartphone, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'Efectiu', icon: Banknote, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'Transferència', icon: Landmark, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'Altres', icon: Wallet, color: 'text-slate-600 bg-slate-50 border-slate-200' },
];

export default function TripSettleModal({ data, onClose, users, currency, onConfirm }: TripSettleModalProps) {
  const [method, setMethod] = useState('Bizum');
  const [isLoading, setIsLoading] = useState(false);

  if (!data) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    const success = await onConfirm(data, method);
    setIsLoading(false);
    if (success) onClose();
  };

  const fromUser = users.find(u => u.id === data.from);
  const toUser = users.find(u => u.id === data.to);

  return (
    <Modal isOpen={!!data} onClose={onClose} title="Confirmar Pagament">
      <div className="flex flex-col items-center space-y-8 py-4 animate-fade-in">
        
        {/* SUMMARY CARD */}
        <div className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4 relative overflow-hidden">
             {/* Background Decor */}
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
             
             <div className="flex items-center gap-4 w-full justify-between px-2">
                <div className="flex flex-col items-center gap-2">
                    <Avatar name={fromUser?.name || '?'} photoUrl={fromUser?.photoUrl} size="md" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 max-w-[80px] truncate">{fromUser?.name}</span>
                </div>

                <div className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Paga a</span>
                    <ArrowRight className="text-indigo-400 animate-pulse" size={20} />
                </div>

                <div className="flex flex-col items-center gap-2">
                    <Avatar name={toUser?.name || '?'} photoUrl={toUser?.photoUrl} size="md" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 max-w-[80px] truncate">{toUser?.name}</span>
                </div>
             </div>

             <div className="bg-white dark:bg-slate-800 px-6 py-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                    {formatCurrency(data.amount, currency)}
                </span>
             </div>
        </div>
        
        {/* METHOD SELECTION */}
        <div className="w-full space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Mètode de pagament</label>
            <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((m) => {
                const isSelected = method === m.id;
                const Icon = m.icon;
                return (
                    <button 
                    key={m.id} 
                    onClick={() => setMethod(m.id)} 
                    className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-bold transition-all text-sm
                        ${isSelected 
                            ? `${m.color} shadow-sm scale-[1.02]` 
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }
                    `}
                    >
                        <Icon size={18} />
                        {m.id}
                    </button>
                );
            })}
            </div>
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3 w-full pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1 h-12 rounded-xl">Cancel·lar</Button>
          <Button 
            variant="success" 
            onClick={handleConfirm} 
            className="flex-1 h-12 rounded-xl shadow-lg shadow-emerald-500/20" 
            icon={CheckCircle2}
            loading={isLoading}
            haptic="success"
          >
            Confirmar
          </Button>
        </div>
      </div>
    </Modal>
  );
}