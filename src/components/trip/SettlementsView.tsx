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
                  <ThumbsUp size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-1">Tot quadrat!</h3>
              <p className="text-slate-400 dark:text-slate-500">Ningú deu res a ningú.</p>
          </div>
      );
  }

  return (
    <div className="space-y-4 animate-fade-in pb-4"> {/* Padding bottom extra pel scroll */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl mb-6 flex gap-3 items-start">
            <div className="bg-indigo-100 dark:bg-indigo-800 p-1.5 rounded-full text-indigo-600 dark:text-indigo-300 mt-0.5 shrink-0">
               <ArrowRight size={16} />
            </div>
            <p className="text-sm text-indigo-800 dark:text-indigo-300 font-medium leading-relaxed">
                Pla òptim per liquidar deutes amb el mínim de moviments.
            </p>
        </div>

        {settlements.map((settlement) => {
            const debtor = getUser(settlement.from);
            const creditor = getUser(settlement.to);
            const settleKey = `${settlement.from}-${settlement.to}-${settlement.amount}`;

            return (
                <div 
                    key={settleKey} 
                    className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all hover:shadow-md"
                >
                    {/* VISUALITZACIÓ DEL FLUX (Debtor -> Creditor) */}
                    <div className="flex-1 w-full flex items-center justify-between gap-2">
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
                        
                        {/* Fletxa / Connectors */}
                        <div className="flex-1 flex flex-col items-center px-2 relative top-[-8px]">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Paga a</span>
                            <div className="h-[2px] w-full bg-gradient-to-r from-rose-200 via-slate-200 to-emerald-200 dark:from-rose-900 dark:via-slate-700 dark:to-emerald-900 rounded-full" />
                            <ArrowRight size={14} className="text-slate-400 absolute top-[19px]" />
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

                    {/* BLOC D'ACCIÓ (Import + Botó) */}
                    <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 pt-4 sm:pt-0 sm:pl-6 gap-3">
                        <span className="block text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            {formatCurrency(settlement.amount, currency)}
                        </span>
                        
                        {/* Botó UX Millorat: Àrea de toc gran i clara */}
                        <Button 
                            variant="secondary"
                            onClick={() => onSettle(settlement)} 
                            className="text-xs h-10 px-5 shadow-sm border-indigo-100 dark:border-indigo-900/50 hover:border-indigo-300 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-900/20"
                            icon={CheckCircle2}
                            aria-label={`Liquidar deute de ${formatCurrency(settlement.amount, currency)} de ${debtor?.name} a ${creditor?.name}`}
                        >
                            Liquidar
                        </Button>
                    </div>
                </div>
            );
        })}
    </div>
  );
}