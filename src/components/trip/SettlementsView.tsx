import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import Card from '../Card';
import Button from '../Button';
import { Settlement, Currency, TripUser } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface SettlementsViewProps {
  settlements: Settlement[];
  onSettle: (s: Settlement) => void;
  currency: Currency;
  users: TripUser[];
}

export default function SettlementsView({ settlements, onSettle, currency, users }: SettlementsViewProps) {
  
  const getUserName = (id: string) => users.find(u => u.id === id)?.name || '???';

  if (settlements.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 animate-fade-in">
            {/* AFEGIT: dark:bg-emerald-900/30 dark:text-emerald-400 */}
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-3xl shadow-sm">🎉</div>
            <div>
                {/* AFEGIT: dark:text-white i dark:text-slate-400 */}
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Tot quadrat!</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">No hi ha deutes pendents.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {settlements.map((s, idx) => (
        // AFEGIT: dark:border-l-indigo-400 (perquè brilli més)
        <Card key={idx} className="p-4 border-l-4 border-l-indigo-500 dark:border-l-indigo-400">
           <div className="flex flex-col gap-4">
               <div className="flex items-center justify-between">
                    {/* AFEGIT: colors 400 per dark mode */}
                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold">
                        <span>{getUserName(s.from)}</span>
                    </div>
                    {/* AFEGIT: dark:text-slate-600 */}
                    <ArrowRight size={16} className="text-slate-300 dark:text-slate-600" />
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                        <span>{getUserName(s.to)}</span>
                    </div>
               </div>
               
               {/* AFEGIT: border-top fosc */}
               <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-800">
                    <span className="text-2xl font-black text-slate-800 dark:text-white">{formatCurrency(s.amount, currency)}</span>
                    <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => onSettle(s)}
                        // El botó secundari ja s'adapta sol gràcies al Button.tsx que veurem ara
                        className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-transparent hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                        icon={CheckCircle2}
                    >
                        Saldar
                    </Button>
               </div>
            </div>
        </Card>
      ))}
    </div>
  );
}