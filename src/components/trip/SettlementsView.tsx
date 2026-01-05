import { Settlement, Currency, TripUser } from '../../types';
import { formatMoney } from '../../utils/formatters';
import { ArrowRight } from 'lucide-react';

interface SettlementsViewProps {
  settlements: Settlement[];
  currency: Currency;
  users: TripUser[];
  onSettle: (s: Settlement) => void;
}

export default function SettlementsView({ settlements, currency, users, onSettle }: SettlementsViewProps) {
  const getUserName = (id: string) => users.find(u => u.id === id)?.name || '???';

  if (settlements.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl">🎉</div>
            <p className="text-slate-500 font-medium">Tots els deutes estan saldats!</p>
        </div>
    );
  }

  return (
    <div className="space-y-3">
      {settlements.map((s, idx) => (
        <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-3">
           <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-600">{getUserName(s.from)}</span>
                </div>
                <ArrowRight size={16} className="text-slate-300" />
                <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-600">{getUserName(s.to)}</span>
                </div>
           </div>
           
           <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-1">
                <span className="text-xl font-black text-slate-800">{formatMoney(s.amount, currency)}</span>
                <button 
                    onClick={() => onSettle(s)}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-lg hover:bg-indigo-100 transition-colors"
                >
                    Saldar
                </button>
           </div>
        </div>
      ))}
    </div>
  );
}