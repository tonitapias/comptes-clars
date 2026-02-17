import { useMemo } from 'react';
import { Check, PartyPopper, Send, WalletCards } from 'lucide-react';
import { Settlement } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useTrip } from '../../context/TripContext';
import Avatar from '../Avatar';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

interface SettlementsViewProps {
  settlements: Settlement[];
  onSettle: (s: Settlement) => void;
}

export default function SettlementsView({ settlements, onSettle }: SettlementsViewProps) {
  const { tripData } = useTrip();
  const { trigger } = useHapticFeedback();

  const userMap = useMemo(() => {
    if (!tripData?.users) return {};
    return tripData.users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, typeof tripData.users[0]>);
  }, [tripData?.users]);

  if (!tripData) return null;
  const { currency } = tripData;

  const getUser = (id: string) => userMap[id];

  if (settlements.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in px-6">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-8 rounded-full mb-6 relative shadow-sm border border-emerald-100 dark:border-emerald-900/50">
                  <PartyPopper size={48} className="text-emerald-500 dark:text-emerald-400" strokeWidth={1.5} />
                  <div className="absolute top-0 right-0 -mr-1 -mt-1 bg-yellow-400 text-white p-2 rounded-full shadow-sm animate-bounce">
                      <Check size={14} strokeWidth={4} />
                  </div>
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                  Tot al dia!
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-[240px] mx-auto leading-relaxed">
                  No hi ha deutes pendents. Podeu relaxar-vos.
              </p>
          </div>
      );
  }

  return (
    <div className="space-y-4 animate-fade-in pb-24">
        
        <div className="px-1 flex items-center justify-between">
            <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                Pla de Pagaments
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px] tabular-nums">
                    {settlements.length}
                </span>
            </h3>
        </div>

        <div className="grid gap-3">
            {settlements.map((settlement, idx) => {
                const debtor = getUser(settlement.from);
                const creditor = getUser(settlement.to);
                const settleKey = `${settlement.from}-${settlement.to}-${settlement.amount}-${idx}`;

                return (
                    <div 
                        key={settleKey} 
                        className="group bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-all hover:shadow-md hover:border-indigo-100 dark:hover:border-slate-700"
                    >
                        <div className="flex items-stretch">
                            
                            <div className="flex-1 p-4 flex flex-col justify-center gap-1 min-w-0">
                                <div className="flex items-center gap-2.5">
                                    <Avatar name={debtor?.name || '?'} photoUrl={debtor?.photoUrl} size="sm" className="ring-2 ring-slate-50 dark:ring-slate-800" />
                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">{debtor?.name}</span>
                                </div>
                                
                                <div className="flex items-center gap-2 mt-2 text-slate-400 dark:text-slate-500 text-xs pl-1">
                                    <Send size={12} />
                                    <span className="font-medium">paga a</span>
                                    <span className="font-bold text-slate-600 dark:text-slate-300 truncate max-w-[80px]">{creditor?.name}</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-end justify-center p-3 pr-4 bg-slate-50/50 dark:bg-slate-800/30 border-l border-slate-100 dark:border-slate-800 min-w-[120px]">
                                <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums tracking-tight mb-2">
                                    {formatCurrency(settlement.amount, currency)}
                                </div>
                                
                                <button 
                                    onClick={() => {
                                        trigger('success');
                                        onSettle(settlement);
                                    }} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-all active:scale-95"
                                >
                                    <Check size={12} strokeWidth={3} />
                                    Liquidar
                                </button>
                            </div>
                        </div>

                        <div className="absolute left-0 bottom-0 w-1 h-full bg-indigo-500/80 rounded-l-md" />
                    </div>
                );
            })}
        </div>
        
        <div className="flex items-center justify-center gap-2 opacity-50 mt-8">
            <WalletCards size={16} className="text-slate-400" />
            <p className="text-xs text-slate-400 text-center">
                Els pagaments es fan fora de l'app (Bizum, Efectiu...)
            </p>
        </div>
    </div>
  );
}