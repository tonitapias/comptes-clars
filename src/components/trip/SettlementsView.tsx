import React, { useMemo } from 'react';
import { ArrowRight, CheckCircle2, ThumbsUp } from 'lucide-react';
import { Settlement } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useTrip } from '../../context/TripContext';

interface SettlementsViewProps {
  settlements: Settlement[];
  onSettle: (s: Settlement) => void;
}

export default function SettlementsView({ settlements, onSettle }: SettlementsViewProps) {
  const { tripData } = useTrip();
  if (!tripData) return null;
  const { users, currency } = tripData;

  // Optimització: Creem un mapa d'usuaris per a cerques O(1)
  const userMap = useMemo(() => {
    return users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, typeof users[0]>);
  }, [users]);

  const getUser = (id: string) => userMap[id];

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
                Pla òptim per liquidar deutes amb el mínim de moviments.
            </p>
        </div>

        {settlements.map((settlement) => {
            const debtor = getUser(settlement.from);
            const creditor = getUser(settlement.to);
            // Key única basada en els IDs
            const settleKey = `${settlement.from}-${settlement.to}-${settlement.amount}`;

            return (
                <div key={settleKey} className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 transition-all hover:shadow-md">
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                        {/* Pagador */}
                        <div className="flex flex-col items-center min-w-[70px]">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-1 overflow-hidden border-2 border-rose-100 dark:border-rose-900/30">
                                {debtor?.photoUrl ? (
                                    <img src={debtor.photoUrl} alt={debtor.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs font-bold text-slate-500">{debtor?.name.charAt(0)}</span>
                                )}
                            </div>
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate w-full text-center">{debtor?.name || 'Usuari'}</span>
                            <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">Paga</span>
                        </div>
                        
                        {/* Fletxa / Mètode */}
                        <div className="flex-1 flex flex-col items-center">
                            <span className="text-[10px] text-slate-400 mb-1 font-medium">via Bizum/etc</span>
                            <div className="h-[2px] w-full bg-slate-100 dark:bg-slate-800 relative">
                                 <ArrowRight size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 bg-white dark:bg-slate-900 px-1"/>
                            </div>
                        </div>

                        {/* Receptor */}
                        <div className="flex flex-col items-center min-w-[70px]">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-1 overflow-hidden border-2 border-emerald-100 dark:border-emerald-900/30">
                                {creditor?.photoUrl ? (
                                    <img src={creditor.photoUrl} alt={creditor.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs font-bold text-slate-500">{creditor?.name.charAt(0)}</span>
                                )}
                            </div>
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate w-full text-center">{creditor?.name || 'Usuari'}</span>
                            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Rep</span>
                        </div>
                    </div>

                    <div className="text-right border-l border-slate-50 dark:border-slate-800 pl-4">
                        <span className="block text-lg font-black text-slate-900 dark:text-white">{formatCurrency(settlement.amount, currency)}</span>
                        <button 
                            onClick={() => onSettle(settlement)} 
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-end gap-1 hover:text-indigo-700 dark:hover:text-indigo-300 mt-1 transition-colors"
                        >
                            <CheckCircle2 size={12}/> Liquidar
                        </button>
                    </div>
                </div>
            );
        })}
    </div>
  );
}