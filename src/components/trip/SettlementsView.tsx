import React, { useMemo } from 'react';
import { ArrowRight, Check, PartyPopper, Wallet, Banknote } from 'lucide-react';
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
              <div className="relative mb-6">
                  <div className="absolute inset-0 bg-emerald-400 blur-2xl opacity-20 rounded-full animate-pulse-slow"></div>
                  <div className="bg-gradient-to-br from-emerald-100 to-teal-50 dark:from-emerald-900/40 dark:to-teal-900/20 text-emerald-600 dark:text-emerald-400 p-8 rounded-full shadow-financial-md border border-emerald-100 dark:border-emerald-800/50 relative z-10">
                      <PartyPopper size={48} strokeWidth={1.5} className="animate-bounce-slow" />
                  </div>
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">
                  Tot quadrat!
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xs mx-auto leading-relaxed">
                  Ningú deu res a ningú. <br/>Gaudiu del moment! 🍻
              </p>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24">
        
        {/* --- HEADER --- */}
        <div className="bg-indigo-50/80 dark:bg-indigo-950/30 p-5 rounded-3xl flex gap-4 items-start border border-indigo-100 dark:border-indigo-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-indigo-900/50 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 shadow-sm shrink-0 mt-0.5">
               <Wallet size={20} strokeWidth={2} />
            </div>
            <div>
                <h4 className="font-black text-indigo-900 dark:text-indigo-100 text-sm mb-1">Pla de Liquidació Òptim</h4>
                <p className="text-sm text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed">
                    Aquests són els moviments mínims necessaris per saldar tots els deutes del grup.
                </p>
            </div>
        </div>

        {/* --- LLISTA DE TIQUETS --- */}
        <div className="grid gap-5">
            {settlements.map((settlement, idx) => {
                const debtor = getUser(settlement.from);
                const creditor = getUser(settlement.to);
                // Clau única composta per evitar errors de renderitzat
                const settleKey = `${settlement.from}-${settlement.to}-${settlement.amount}-${idx}`;

                return (
                    <div 
                        key={settleKey} 
                        className="group relative bg-white dark:bg-slate-900 rounded-[1.75rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all hover:shadow-financial-md hover:border-indigo-200 dark:hover:border-indigo-900"
                    >
                        {/* Fons decoratiu subtil */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-bl-[4rem] -z-0 opacity-50 transition-transform group-hover:scale-110" />

                        <div className="relative z-10 p-6 flex flex-col gap-6">
                            
                            {/* TOP: CONNEXIÓ USUARIS */}
                            <div className="flex items-center justify-between">
                                {/* Payer */}
                                <div className="flex flex-col items-center gap-2 relative">
                                    <Avatar name={debtor?.name || '?'} photoUrl={debtor?.photoUrl} size="lg" className="ring-4 ring-slate-50 dark:ring-slate-900" />
                                    <span className="text-xs font-bold text-slate-500 max-w-[80px] truncate text-center bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                        {debtor?.name}
                                    </span>
                                </div>

                                {/* Connector Central */}
                                <div className="flex-1 px-4 flex flex-col items-center justify-center -mt-4">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Paga a</span>
                                    <div className="w-full h-px border-t-2 border-dashed border-slate-200 dark:border-slate-700 relative flex items-center justify-center">
                                        <div className="bg-white dark:bg-slate-900 px-2 text-slate-300 dark:text-slate-600">
                                            <ArrowRight size={16} />
                                        </div>
                                    </div>
                                </div>

                                {/* Receiver */}
                                <div className="flex flex-col items-center gap-2 relative">
                                    <Avatar name={creditor?.name || '?'} photoUrl={creditor?.photoUrl} size="lg" className="ring-4 ring-emerald-50 dark:ring-emerald-900/20" />
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 max-w-[80px] truncate text-center bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/50">
                                        {creditor?.name}
                                    </span>
                                </div>
                            </div>

                            {/* BOTTOM: IMPORT I ACCIÓ */}
                            <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 border-dashed">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400">
                                        <Banknote size={24} strokeWidth={1.5} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Import</span>
                                        <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums leading-none">
                                            {formatCurrency(settlement.amount, currency)}
                                        </span>
                                    </div>
                                </div>

                                <Button 
                                    variant="primary"
                                    onClick={() => {
                                        trigger('success'); // Vibració de confirmació
                                        onSettle(settlement);
                                    }} 
                                    className="px-5 h-12 text-sm shadow-indigo-200 dark:shadow-none bg-indigo-600 hover:bg-indigo-700"
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