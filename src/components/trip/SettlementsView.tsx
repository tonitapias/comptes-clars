import React, { useMemo } from 'react';
import { ArrowRight, Check, PartyPopper, Wallet, ShieldCheck } from 'lucide-react';
import { Settlement } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useTrip } from '../../context/TripContext';
import Button from '../Button';
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

  // --- EMPTY STATE (Celebració) ---
  if (settlements.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in px-6">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-8 rounded-full mb-6 relative">
                  <PartyPopper size={40} className="text-emerald-500 dark:text-emerald-400" strokeWidth={1.5} />
                  <div className="absolute top-0 right-0 -mr-2 -mt-2 bg-yellow-400 text-white p-1.5 rounded-full shadow-sm animate-bounce">
                      <Check size={12} strokeWidth={4} />
                  </div>
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                  Comptes tancats!
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-[240px] mx-auto leading-relaxed">
                  No hi ha deutes pendents. Tothom està al dia.
              </p>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24">
        
        {/* --- HEADER: SMART INSIGHT --- */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex gap-4 items-center shadow-sm">
            <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl shadow-sm text-indigo-500 shrink-0">
               <ShieldCheck size={20} strokeWidth={2} />
            </div>
            <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Pla d'optimització</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    Moviments mínims per liquidar el grup.
                </p>
            </div>
        </div>

        {/* --- LLISTA DE MOVIMENTS --- */}
        <div className="space-y-4">
            {settlements.map((settlement, idx) => {
                const debtor = getUser(settlement.from);
                const creditor = getUser(settlement.to);
                const settleKey = `${settlement.from}-${settlement.to}-${settlement.amount}-${idx}`;

                return (
                    <div 
                        key={settleKey} 
                        className="group bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden relative transition-all hover:shadow-md hover:border-indigo-100 dark:hover:border-slate-700"
                    >
                        {/* Decoració lateral de color */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500" />

                        <div className="p-5 pl-7">
                            {/* TOP ROW: ACTORS */}
                            <div className="flex items-center justify-between mb-6">
                                {/* Debtor */}
                                <div className="flex items-center gap-3">
                                    <Avatar name={debtor?.name || '?'} photoUrl={debtor?.photoUrl} size="md" className="ring-2 ring-white dark:ring-slate-800 shadow-sm" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paga</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate max-w-[80px] sm:max-w-[120px]">{debtor?.name}</span>
                                    </div>
                                </div>

                                {/* Arrow Icon */}
                                <div className="text-slate-300 dark:text-slate-600">
                                    <ArrowRight size={20} strokeWidth={2.5} />
                                </div>

                                {/* Creditor */}
                                <div className="flex items-center gap-3 flex-row-reverse text-right">
                                    <Avatar name={creditor?.name || '?'} photoUrl={creditor?.photoUrl} size="md" className="ring-2 ring-white dark:ring-slate-800 shadow-sm" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rep</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate max-w-[80px] sm:max-w-[120px]">{creditor?.name}</span>
                                    </div>
                                </div>
                            </div>

                            {/* BOTTOM ROW: AMOUNT & ACTION */}
                            <div className="flex items-end justify-between border-t border-slate-50 dark:border-slate-800 pt-4">
                                <div>
                                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums tracking-tight">
                                        {formatCurrency(settlement.amount, currency)}
                                    </div>
                                </div>

                                <Button 
                                    onClick={() => {
                                        trigger('success');
                                        onSettle(settlement);
                                    }} 
                                    className="h-10 px-5 text-xs font-bold bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 border border-slate-200 hover:border-emerald-200 shadow-sm transition-all rounded-xl"
                                    icon={Check}
                                >
                                    Liquidar
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
}