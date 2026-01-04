import React from 'react';
import { Info, CheckCircle2, ChevronRight } from 'lucide-react';
import { Settlement, Currency } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface SettlementsViewProps {
  settlements: Settlement[];
  onSettleDebt: (s: Settlement) => void;
  currency: Currency;
}

export default function SettlementsView({ settlements, onSettleDebt, currency }: SettlementsViewProps) {
  return (
    <div className="space-y-4 animate-fade-in">
       <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-4 text-sm text-indigo-800 flex gap-2">
           <Info size={20} className="shrink-0"/> Fes clic en un deute per marcar-lo com a pagat.
       </div>
       {settlements.length === 0 ? (
           <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 shadow-sm">
               <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={32}/>
               <p>Tot quadrat!</p>
           </div>
       ) : (
           settlements.map((s, idx) => (
               <div key={idx} onClick={() => onSettleDebt(s)} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98]">
                   <div className="flex flex-col items-center w-20"><span className="font-bold text-rose-600">{s.from}</span></div>
                   <div className="flex-1 px-2 flex flex-col items-center">
                       <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Paga a</span>
                       <ChevronRight size={14} className="text-slate-300 my-1"/>
                       <div className="bg-indigo-600 text-white px-3 py-1 rounded-full font-bold text-sm shadow-md">{formatCurrency(s.amount, currency)}</div>
                   </div>
                   <div className="flex flex-col items-center w-20"><span className="font-bold text-emerald-600">{s.to}</span></div>
               </div>
           ))
       )}
    </div>
  );
}