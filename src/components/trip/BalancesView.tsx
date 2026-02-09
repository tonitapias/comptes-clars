import React, { useMemo } from 'react';
import DonutChart from '../DonutChart';
import { Balance, CategoryStat } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useTrip } from '../../context/TripContext';

interface BalancesViewProps {
  balances: Balance[];
  categoryStats: CategoryStat[];
}

export default function BalancesView({ balances, categoryStats }: BalancesViewProps) {
  const { tripData } = useTrip();
  if (!tripData) return null;
  const { users, currency } = tripData;

  // Optimització: Mapa d'usuaris per a cerques instantànies
  const userMap = useMemo(() => {
    return users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, typeof users[0]>);
  }, [users]);

  return (
    <div className="space-y-6 animate-fade-in">
        {/* Gràfic de Categories */}
        <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-6">Despeses per Categoria</h3>
            <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-48 h-48 shrink-0 relative">
                    <DonutChart data={categoryStats} />
                </div>
                
                <div className="flex-1 w-full space-y-4">
                    {categoryStats.map(stat => (
                        <div key={stat.id} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <stat.icon size={14} className={stat.color.split(' ')[1]} />
                                    {stat.label}
                                </span>
                                <span className="text-slate-700 dark:text-slate-200">{formatCurrency(stat.amount, currency)}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${stat.barColor}`} 
                                    style={{ width: `${stat.percentage}%` }}
                                />
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-slate-400 font-bold">{stat.percentage.toFixed(1)}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Balanços per Persona */}
        <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-4">Balanç per Persona</h3>
            <div className="space-y-3">
                {balances.map(balance => {
                    const user = userMap[balance.userId];
                    const isPositive = balance.amount > 0;
                    // Millora: Llindar d'1 cèntim per a la lògica d'enters
                    const isZero = Math.abs(balance.amount) < 1;
                    
                    return (
                        <div key={balance.userId} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    {user?.photoUrl ? (
                                        <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-sm font-bold text-slate-400">{user?.name.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-700 dark:text-slate-200">{user?.name || balance.userId}</span>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">
                                        {isZero ? 'Al dia' : isPositive ? 'Ha de cobrar' : 'Ha de pagar'}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="text-right">
                                <span className={`font-black font-mono text-lg ${isZero ? 'text-slate-400' : isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {isPositive ? '+' : ''}{formatCurrency(balance.amount, currency)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    </div>
  );
}