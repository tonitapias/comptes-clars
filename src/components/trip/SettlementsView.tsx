import React, { useMemo } from 'react';
import { ArrowRight, Check, ThumbsUp, Wallet } from 'lucide-react';
import { Settlement } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useTrip } from '../../context/TripContext';
import Button from '../Button';
import Avatar from '../Avatar'; // Import arreglat

interface SettlementsViewProps {
  settlements: Settlement[];
  onSettle: (s: Settlement) => void;
}

export default function SettlementsView({ settlements, onSettle }: SettlementsViewProps) {
  const { tripData } = useTrip();
  if (!tripData) return null;
  const { users, currency } = tripData;

  const userMap = useMemo(() => {
    return users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, typeof users[0]>);
  }, [users]);

  const getUser = (id: string) => userMap[id];

  if (settlements.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in px-6">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-6 rounded-full mb-6 shadow-financial-sm">
                  <ThumbsUp size={40} strokeWidth={1.5} aria-hidden="true" />
              </div>
              <h3 className="text-2xl font-black text-content-body mb-2">Tot quadrat!</h3>
              <p className="text-content-muted text-lg max-w-xs mx-auto">
                  Ningú deu res a ningú. Gaudiu del moment.
              </p>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-3xl flex gap-4 items-start border border-indigo-100 dark:border-indigo-800 shadow-sm">
            <div className="bg-white dark:bg-indigo-800 p-2 rounded-xl text-primary shadow-sm shrink-0">
               <Wallet size={20} aria-hidden="true" />
            </div>
            <div>
                <h4 className="font-bold text-indigo-900 dark:text-indigo-100 text-sm">Pla de Liquidació Òptim</h4>
                <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-0.5 leading-relaxed">
                    Aquests són els moviments mínims necessaris per saldar tots els deutes del grup.
                </p>
            </div>
        </div>

        <div className="grid gap-4">
        {settlements.map((settlement) => {
            const debtor = getUser(settlement.from);
            const creditor = getUser(settlement.to);
            const settleKey = `${settlement.from}-${settlement.to}-${settlement.amount}`;

            return (
                <div 
                    key={settleKey} 
                    className="group bg-surface-card rounded-3xl shadow-financial-sm border border-slate-100 dark:border-slate-800 p-5 transition-all hover:shadow-financial-md hover:-translate-y-0.5"
                >
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                        
                        <div className="flex-1 w-full flex items-center justify-between sm:justify-start sm:gap-8">
                            
                            {/* Deutor */}
                            <div className="flex flex-col items-center gap-2 w-20">
                                <Avatar 
                                    name={debtor?.name || '?'} 
                                    photoUrl={debtor?.photoUrl} 
                                    size="lg"
                                />
                                <span className="text-xs font-bold text-content-muted truncate w-full text-center">
                                    {debtor?.name}
                                </span>
                            </div>

                            {/* Fletxa i Import */}
                            <div className="flex-1 flex flex-col items-center px-2 relative top-[-4px]">
                                <span className="text-[10px] uppercase font-black tracking-widest text-content-subtle mb-1">Paga a</span>
                                <div className="flex items-center gap-2 text-content-subtle opacity-40 mb-1">
                                    <span className="h-0.5 w-full bg-current rounded-full"></span>
                                    <ArrowRight size={16} />
                                    <span className="h-0.5 w-full bg-current rounded-full"></span>
                                </div>
                                <span className="font-black text-2xl sm:text-3xl text-content-body tabular-nums tracking-tight">
                                    {formatCurrency(settlement.amount, currency)}
                                </span>
                            </div>

                            {/* Creditor */}
                            <div className="flex flex-col items-center gap-2 w-20">
                                <Avatar 
                                    name={creditor?.name || '?'} 
                                    photoUrl={creditor?.photoUrl} 
                                    size="lg"
                                />
                                <span className="text-xs font-bold text-content-muted truncate w-full text-center">
                                    {creditor?.name}
                                </span>
                            </div>
                        </div>

                        {/* Botó */}
                        <div className="w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 flex justify-center">
                            <Button 
                                variant="primary"
                                onClick={() => onSettle(settlement)} 
                                className="w-full sm:w-auto px-6 py-3 text-sm"
                                icon={Check}
                                haptic="success"
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