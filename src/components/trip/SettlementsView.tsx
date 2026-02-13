import React, { useMemo } from 'react';
import { ArrowRight, CheckCircle2, ThumbsUp } from 'lucide-react';
import { Settlement } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useTrip } from '../../context/TripContext';
import Button from '../Button'; // Importem el component Button millorat

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
    <div className="space-y-6 animate-fade-in pb-4">
        {/* Banner Informatiu */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl flex gap-3 items-start border border-indigo-100 dark:border-indigo-900/30">
            <div className="bg-indigo-100 dark:bg-indigo-800 p-1.5 rounded-full text-indigo-600 dark:text-indigo-300 mt-0.5 shrink-0">
               <ArrowRight size={16} aria-hidden="true" />
            </div>
            <p className="text-sm text-indigo-900 dark:text-indigo-200 font-medium leading-relaxed">
                Aquest és el pla òptim per liquidar tots els deutes del grup amb el mínim de moviments possibles.
            </p>
        </div>

        {settlements.map((settlement) => {
            const debtor = getUser(settlement.from);
            const creditor = getUser(settlement.to);
            const settleKey = `${settlement.from}-${settlement.to}-${settlement.amount}`;

            return (
                <div 
                    key={settleKey} 
                    className="group bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900"
                >
                    <div className="flex flex-col sm:flex-row">
                        
                        {/* ZONA 1: CONTEXT (QUI PAGA A QUI) - Fons neutre */}
                        <div className="p-5 flex-1 flex items-center justify-between gap-4">
                            {/* Pagador */}
                            <div className="flex flex-col items-center w-20 shrink-0">
                                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2 overflow-hidden border-2 border-rose-100 dark:border-rose-900/30 shadow-sm">
                                    {debtor?.photoUrl ? (
                                        <img src={debtor.photoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-lg font-bold text-slate-500">{debtor?.name.charAt(0)}</span>
                                    )}
                                </div>
                                <span className="font-bold text-xs text-slate-700 dark:text-slate-300 truncate w-full text-center block leading-tight">
                                    {debtor?.name || 'Usuari'}
                                </span>
                            </div>

                            {/* Fletxa animada en hover */}
                            <div className="flex-1 flex flex-col items-center px-2">
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">PAGA A</span>
                                <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                                     <div className="absolute inset-0 bg-indigo-500/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                                </div>
                                <ArrowRight size={16} className="text-slate-300 dark:text-slate-600 mt-1" aria-hidden="true" />
                            </div>

                            {/* Receptor */}
                            <div className="flex flex-col items-center w-20 shrink-0">
                                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2 overflow-hidden border-2 border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                                    {creditor?.photoUrl ? (
                                        <img src={creditor.photoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-lg font-bold text-slate-500">{creditor?.name.charAt(0)}</span>
                                    )}
                                </div>
                                <span className="font-bold text-xs text-slate-700 dark:text-slate-300 truncate w-full text-center block leading-tight">
                                    {creditor?.name || 'Usuari'}
                                </span>
                            </div>
                        </div>

                        {/* ZONA 2: ACCIÓ (IMPORT I BOTÓ) - Fons diferenciat */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-5 sm:w-64 flex flex-col items-center justify-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 border-dashed">
                            <div className="text-center">
                                <span className="block text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    {formatCurrency(settlement.amount, currency)}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pendent</span>
                            </div>
                            
                            <Button 
                                variant="primary" // Acció principal = Primary
                                onClick={() => onSettle(settlement)} 
                                className="w-full text-sm shadow-indigo-200 dark:shadow-none"
                                icon={CheckCircle2}
                                aria-label={`Liquidar deute de ${formatCurrency(settlement.amount, currency)} de ${debtor?.name} a ${creditor?.name}`}
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