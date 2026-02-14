// src/components/trip/SettlementsView.tsx
import React, { useMemo } from 'react';
import { ArrowRight, CheckCircle2, ThumbsUp } from 'lucide-react';
import { Settlement } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useTrip } from '../../context/TripContext';
import Button from '../Button';
// IMPORT DRY:
import { getAvatarColor } from '../../utils/ui';

interface SettlementsViewProps {
  settlements: Settlement[];
  onSettle: (s: Settlement) => void;
}

export default function SettlementsView({ settlements, onSettle }: SettlementsViewProps) {
  const { tripData } = useTrip();
  if (!tripData) return null;
  const { users, currency } = tripData;

  // Optimització: Mapa O(1)
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
                  <ThumbsUp size={32} aria-hidden="true" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-1">Tot quadrat!</h3>
              <p className="text-slate-400 dark:text-slate-500">Ningú deu res a ningú.</p>
          </div>
      );
  }

  return (
    <div className="space-y-4 animate-fade-in pb-4">
        {/* Banner Informatiu (Més compacte) */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-2xl flex gap-3 items-center border border-indigo-100 dark:border-indigo-900/30">
            <div className="bg-indigo-100 dark:bg-indigo-800 p-1.5 rounded-full text-indigo-600 dark:text-indigo-300 shrink-0">
               <ArrowRight size={14} aria-hidden="true" />
            </div>
            <p className="text-xs text-indigo-900 dark:text-indigo-200 font-medium leading-relaxed">
                Pla òptim per liquidar deutes amb el mínim de moviments.
            </p>
        </div>

        {settlements.map((settlement) => {
            const debtor = getUser(settlement.from);
            const creditor = getUser(settlement.to);
            const settleKey = `${settlement.from}-${settlement.to}-${settlement.amount}`;

            // Utilitzem el helper DRY per als colors
            const debtorColor = getAvatarColor(debtor?.name || '?');
            const creditorColor = getAvatarColor(creditor?.name || '?');

            return (
                <div 
                    key={settleKey} 
                    // FIX VISUAL: Eliminat 'hover:border-indigo-200' en dark mode per evitar "glow"
                    className="group bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all hover:shadow-md dark:hover:shadow-none dark:hover:border-slate-700"
                >
                    <div className="flex flex-col sm:flex-row">
                        
                        {/* ZONA 1: CONTEXT (Compactada) */}
                        <div className="p-4 flex-1 flex items-center justify-between gap-2 sm:gap-4">
                            {/* Pagador */}
                            <div className="flex flex-col items-center w-16 shrink-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 overflow-hidden shadow-sm ${debtorColor}`}>
                                    {debtor?.photoUrl ? (
                                        <img src={debtor.photoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-sm font-black">{debtor?.name.charAt(0)}</span>
                                    )}
                                </div>
                                <span className="font-bold text-[10px] text-slate-600 dark:text-slate-400 truncate w-full text-center">
                                    {debtor?.name || 'Usuari'}
                                </span>
                            </div>

                            {/* Fletxa animada */}
                            <div className="flex-1 flex flex-col items-center px-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">PAGA A</span>
                                <ArrowRight size={16} className="text-slate-300 dark:text-slate-600" aria-hidden="true" />
                            </div>

                            {/* Receptor */}
                            <div className="flex flex-col items-center w-16 shrink-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 overflow-hidden shadow-sm ${creditorColor}`}>
                                    {creditor?.photoUrl ? (
                                        <img src={creditor.photoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-sm font-black">{creditor?.name.charAt(0)}</span>
                                    )}
                                </div>
                                <span className="font-bold text-[10px] text-slate-600 dark:text-slate-400 truncate w-full text-center">
                                    {creditor?.name || 'Usuari'}
                                </span>
                            </div>
                        </div>

                        {/* ZONA 2: ACCIÓ (Compactada) */}
                        <div className="bg-slate-50 dark:bg-slate-800/30 p-3 sm:w-56 flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800">
                            <div className="text-left sm:text-center pl-2 sm:pl-0">
                                <span className="block text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                                    {formatCurrency(settlement.amount, currency)}
                                </span>
                            </div>
                            
                            <Button 
                                variant="primary"
                                onClick={() => onSettle(settlement)} 
                                className="text-xs px-4 py-2 h-9 shadow-indigo-200 dark:shadow-none"
                                icon={CheckCircle2}
                            >
                                Liquidar
                            </Button>
                        </div>
                    </div>
                </div>
            );
        })}
    </div>
  );
}