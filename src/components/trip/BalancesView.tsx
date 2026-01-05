import React from 'react';
import Card from '../Card';
import DonutChart from '../DonutChart';
import { Balance, CategoryStat, Currency, TripUser } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface BalancesViewProps {
  balances: Balance[];
  categoryStats: CategoryStat[];
  currency: Currency;
  users: TripUser[]; // Acceptem objectes TripUser
}

export default function BalancesView({ balances, categoryStats, currency, users }: BalancesViewProps) {
  const getUser = (id: string) => users.find(u => u.id === id);

  return (
     <div className="space-y-6 animate-fade-in">
       {categoryStats.length > 0 && (
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-6">
               <DonutChart data={categoryStats} />
               <div className="flex-1 space-y-2">
                   {categoryStats.slice(0, 3).map(stat => (
                       <div key={stat.id} className="flex justify-between items-center text-sm">
                           <span className="flex items-center gap-2 font-medium text-slate-600"><div className={`w-3 h-3 rounded-full ${stat.barColor}`}></div>{stat.label}</span>
                           <span className="font-bold text-slate-800">{Math.round(stat.percentage)}%</span>
                       </div>
                   ))}
               </div>
           </div>
       )}
       <div className="grid gap-3">
           {balances.map((b) => {
               const user = getUser(b.userId);
               const name = user ? user.name : 'Desconegut';
               const photoUrl = user?.photoUrl;
               
               return (
               <Card key={b.userId} className="p-0 overflow-hidden">
                   <div className="p-5 relative z-10">
                       <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                               <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm overflow-hidden ${b.amount >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                    {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover"/> : name.charAt(0)}
                               </div>
                               <div>
                                   <p className="font-bold text-slate-800">{name}</p>
                                   <p className={`text-xs font-bold uppercase ${b.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{b.amount >= 0 ? 'Recupera' : 'Ha de pagar'}</p>
                               </div>
                           </div>
                           <span className={`text-xl font-black ${b.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{b.amount >= 0 ? '+' : ''}{formatCurrency(b.amount, currency)}</span>
                       </div>
                   </div>
               </Card>
           )})}
       </div>
     </div>
  );
}