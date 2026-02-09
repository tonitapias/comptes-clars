import React from 'react';
import { ArrowRight, CheckCircle2, ThumbsUp } from 'lucide-react';
import { Settlement } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useTrip } from '../../context/TripContext'; // <--- NOU

interface SettlementsViewProps {
  settlements: Settlement[];
  onSettle: (s: Settlement) => void;
  // currency i users ELIMINATS
}

export default function SettlementsView({ settlements, onSettle }: SettlementsViewProps) {
  const { tripData } = useTrip();
  if (!tripData) return null;
  const { users, currency } = tripData;

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || id;

  if (settlements.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-4 rounded-full mb-4">
                  <ThumbsUp size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-1">Tot quadrat!</h3>
              <p className="text-slate-400 dark:text-slate-500">Ningú deu res a ningú.</p>
          </div>
      );
  }

  return (
    <div className="space-y-4 animate-fade-in">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl mb-6">
            <p className="text-sm text-indigo-800 dark:text-indigo-300 font-medium text-center">
                Aquest és el pla òptim per liquidar tots els deutes amb el mínim de moviments possibles.
            </p>
        </div>

        {settlements.map((settlement, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 transition-transform hover:scale-[1.01]">
                <div className="flex-1 min-w-0 flex items-center gap-3">
                    <div className="flex flex-col items-center min-w-[60px]">
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[80px]">{getUserName(settlement.from)}</span>
                        <span className="text-xs text-rose-500 font-bold">Paga</span>
                    </div>
                    
                    <div className="flex-1 flex flex-col items-center">
                        <span className="text-xs text-slate-400 mb-1">via Bizum/etc</span>
                        <div className="h-[2px] w-full bg-slate-200 dark:bg-slate-700 relative">
                             <ArrowRight size={12} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400 bg-white dark:bg-slate-900 px-1"/>
                        </div>
                    </div>

                    <div className="flex flex-col items-center min-w-[60px]">
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[80px]">{getUserName(settlement.to)}</span>
                        <span className="text-xs text-emerald-500 font-bold">Rep</span>
                    </div>
                </div>

                <div className="text-right">
                    <span className="block text-lg font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(settlement.amount, currency)}</span>
                    <button onClick={() => onSettle(settlement)} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1 hover:underline mt-1">
                        <CheckCircle2 size={12}/> Marcar Pagat
                    </button>
                </div>
            </div>
        ))}
    </div>
  );
}