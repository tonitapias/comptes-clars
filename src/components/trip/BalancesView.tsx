import React from 'react';
import Card from '../Card';
import DonutChart from '../DonutChart';
import { Balance, CategoryStat, Currency, TripUser } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface BalancesViewProps {
  balances: Balance[];
  categoryStats: CategoryStat[];
  currency: Currency;
  users: TripUser[];
}

export default function BalancesView({ balances, categoryStats, currency, users }: BalancesViewProps) {
  
  const getUser = (id: string) => users.find(u => u.id === id);

  return (
     <div className="space-y-6 animate-fade-in">
       {/* GRÀFIC DE CATEGORIES */}
       {categoryStats.length > 0 && (
           <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-6 transition-colors duration-300">
               <DonutChart data={categoryStats} />
               <div className="flex-1 space-y-2">
                   {categoryStats.slice(0, 3).map(stat => (
                       <div key={stat.id} className="flex justify-between items-center text-sm">
                           <span className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300">
                               <div className={`w-3 h-3 rounded-full ${stat.barColor}`}></div>
                               {stat.label}
                           </span>
                           <span className="font-bold text-slate-800 dark:text-white">{Math.round(stat.percentage)}%</span>
                       </div>
                   ))}
               </div>
           </div>
       )}

       {/* LLISTA DE BALANÇOS */}
       <div className="grid gap-3">
           {balances.map((b) => {
               const user = getUser(b.userId); 
               const name = user ? user.name : 'Desconegut';
               const photoUrl = user?.photoUrl;
               const isDeleted = user?.isDeleted;
               const isPositive = b.amount >= 0;
               
               return (
               <Card key={b.userId} className={`p-0 overflow-hidden ${isDeleted ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                   <div className="p-5 relative z-10">
                       <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                               {/* AVATAR */}
                               <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm overflow-hidden ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                    {photoUrl ? (
                                        // CORRECCIÓ: Afegit referrerPolicy
                                        <img src={photoUrl} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer"/>
                                    ) : (
                                        name.charAt(0)
                                    )}
                               </div>
                               <div>
                                   <p className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                     {name} {isDeleted && <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-1 rounded">Ex</span>}
                                   </p>
                                   <p className={`text-xs font-bold uppercase ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                       {isPositive ? 'Recupera' : 'Ha de pagar'}
                                   </p>
                               </div>
                           </div>
                           <span className={`text-xl font-black ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                               {isPositive ? '+' : ''}{formatCurrency(b.amount, currency)}
                           </span>
                       </div>
                   </div>
               </Card>
           )})}
       </div>
     </div>
  );
}