import React, { useMemo } from 'react';
import { ArrowRight, Check, PartyPopper, Wallet, Banknote, Sparkles } from 'lucide-react';
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

  // --- EMPTY STATE (Celebració Premium) ---
  if (settlements.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in px-6">
              <div className="relative mb-8">
                  <div className="absolute inset-0 bg-emerald-400 blur-3xl opacity-20 rounded-full animate-pulse"></div>
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-8 rounded-[2.5rem] shadow-xl relative z-10">
                      <PartyPopper size={48} strokeWidth={1.5} />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-amber-400 text-white p-2 rounded-full shadow-lg animate-bounce">
                      <Sparkles size={20} />
                  </div>
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">
                  Tot al dia!
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-base max-w-[240px] mx-auto leading-relaxed">
                  No queden deutes pendents en aquest grup.
              </p>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24">
        
        {/* --- HEADER: SMART INSIGHT --- */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-5 rounded-[2rem] flex gap-4 items-center border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none shrink-0 z-10">
               <Wallet size={20} strokeWidth={2.5} />
            </div>
            <div className="z-10">
                <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm">Pla d'optimització</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    Hem calculat els moviments mínims per tancar els comptes.
                </p>
            </div>
        </div>

        {/* --- LLISTA DE MOVIMENTS (TARGETES PREMIUM) --- */}
        <div className="grid gap-4">
            {settlements.map((settlement, idx) => {
                const debtor = getUser(settlement.from);
                const creditor = getUser(settlement.to);
                const settleKey = `${settlement.from}-${settlement.to}-${settlement.amount}-${idx}`;

                return (
                    <div 
                        key={settleKey} 
                        className="group relative bg-white dark:bg-slate-900 rounded-[2.2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-all hover:shadow-md"
                    >
                        <div className="p-6 flex flex-col gap-6">
                            
                            {/* FLOW DE TRANSACCIÓ */}
                            <div className="flex items-center justify-between relative">
                                {/* Qui paga (Debtor) */}
                                <div className="flex flex-col items-center gap-2.5 z-10">
                                    <div className="relative">
                                        <Avatar name={debtor?.name || '?'} photoUrl={debtor?.photoUrl} size="lg" className="ring-4 ring-slate-50 dark:ring-slate-800" />
                                        <div className="absolute -bottom-1 -right-1 bg-rose-500 text-white p-1 rounded-full shadow-md border-2 border-white dark:border-slate-900">
                                            <ArrowDownLeft size={10} strokeWidth={4} />
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                        {debtor?.name}
                                    </span>
                                </div>

                                {/* Línia de connexió animada */}
                                <div className="flex-1 px-2 flex flex-col items-center justify-center">
                                    <div className="w-full h-px bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent animate-shimmer" />
                                        <div className="bg-white dark:bg-slate-900 px-3 z-10">
                                            <ArrowRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors" />
                                        </div>
                                    </div>
                                </div>

                                {/* Qui rep (Creditor) */}
                                <div className="flex flex-col items-center gap-2.5 z-10">
                                    <div className="relative">
                                        <Avatar name={creditor?.name || '?'} photoUrl={creditor?.photoUrl} size="lg" className="ring-4 ring-emerald-50 dark:ring-emerald-900/20" />
                                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full shadow-md border-2 border-white dark:border-slate-900">
                                            <ArrowUpRight size={10} strokeWidth={4} />
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/30">
                                        {creditor?.name}
                                    </span>
                                </div>
                            </div>

                            {/* ZONA D'IMPORT I ACCIÓ */}
                            <div className="flex items-center justify-between gap-4 pt-5 border-t border-slate-50 dark:border-slate-800/50">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">A Liquidar</span>
                                    <div className="flex items-center gap-2">
                                        <Banknote size={18} className="text-slate-300" />
                                        <span className="text-2xl font-black text-slate-800 dark:text-white tabular-nums tracking-tighter">
                                            {formatCurrency(settlement.amount, currency)}
                                        </span>
                                    </div>
                                </div>

                                <Button 
                                    onClick={() => {
                                        trigger('success');
                                        onSettle(settlement);
                                    }} 
                                    className="px-6 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 active:scale-95 transition-all text-sm font-bold"
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

// Icons auxiliars que no estaven a l'import original
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';