import React, { useMemo } from 'react';
import DonutChart from '../DonutChart';
import { Balance, CategoryStat, TripUser } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useTrip } from '../../context/TripContext';

interface BalancesViewProps {
  balances: Balance[];
  categoryStats: CategoryStat[];
}

export default function BalancesView({ balances, categoryStats }: BalancesViewProps) {
  const { tripData } = useTrip();
  
  // Optimització: Mapa d'usuaris per a cerques instantànies
  const userMap = useMemo(() => {
    if (!tripData?.users) return {};
    return tripData.users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, TripUser>);
  }, [tripData?.users]);

  if (!tripData) return null;
  const { currency } = tripData;

  return (
    <div className="space-y-6 animate-fade-in">
        {/* Gràfic de Categories */}
        <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-6">Despeses per Categoria</h3>
            <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative w-48 h-48 flex-shrink-0">
                    <DonutChart data={categoryStats} />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs text-slate-400 font-medium">Total</span>
                    </div>
                </div>
                
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                    {categoryStats.map((stat) => (
                        <div key={stat.id} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${stat.barColor}`} />
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                    {stat.label}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    {formatCurrency(stat.amount, currency)}
                                </span>
                                <span className="text-xs text-slate-400 w-8 text-right">
                                    {Math.round(stat.percentage)}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Llista de Balanços */}
        <section className="space-y-3 pb-20">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 px-2">Estat dels Comptes</h3>
            <div className="grid gap-3">
                {balances.map((balance) => {
                    const isPositive = balance.amount > 0;
                    const isZero = balance.amount === 0;
                    const user = userMap[balance.userId];

                    return (
                        <div key={balance.userId} className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                                    {user?.photoUrl ? (
                                      <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-sm font-bold text-slate-400">
                                            {user?.name?.charAt(0).toUpperCase() || '?'}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-700 dark:text-slate-200">
                                        {user?.name || 'Usuari Desconegut'}
                                    </span>
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