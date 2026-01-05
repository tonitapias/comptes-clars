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
  users: TripUser[]; // <--- Necessitem usuaris
}

export default function SettlementsView({ settlements, onSettle, currency, users }: SettlementsViewProps) {
  
  const getUserName = (id: string) => users.find(u => u.id === id)?.name || '???';

  if (settlements.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl shadow-sm">🎉</div>
            <div>
                <h3 className="text-lg font-bold text-slate-800">Tot quadrat!</h3>
                <p className="text-slate-500 font-medium text-sm">No hi ha deutes pendents.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {settlements.map((s, idx) => (
        <Card key={idx} className="p-4 border-l-4 border-l-indigo-500">
           <div className="flex flex-col gap-4">
               <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-600 font-bold">
                        <span>{getUserName(s.from)}</span>
                    </div>
                    <ArrowRight size={16} className="text-slate-300" />
                    <div className="flex items-center gap-2 text-emerald-600 font-bold">
                        <span>{getUserName(s.to)}</span>
                    </div>
               </div>
               
               <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <span className="text-2xl font-black text-slate-800">{formatCurrency(s.amount, currency)}</span>
                    <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => onSettle(s)}
                        className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-transparent"
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