import React, { useMemo } from 'react';
import DonutChart from '../DonutChart';
import { Balance, CategoryStat, TripUser, toCents } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useTrip } from '../../context/TripContext';

interface BalancesViewProps {
  balances: Balance[];
  categoryStats: CategoryStat[];
}

export default function BalancesView({ balances, categoryStats }: BalancesViewProps) {
  const { tripData } = useTrip();
  
  const userMap = useMemo(() => {
    if (!tripData?.users) return {};
    return tripData.users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, TripUser>);
  }, [tripData?.users]);

  if (!tripData) return null;
  const { currency } = tripData;
  const ZERO = toCents(0);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
        
        {/* GRÀFIC DE CATEGORIES */}
        <section className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-8">On van els diners?</h3>
            
            <div className="flex flex-col md:flex-row items-center gap-10">
                {/* Donut Chart amb text central */}
                <div className="relative w-56 h-56 flex-shrink-0">
                    <DonutChart data={categoryStats} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-black text-slate-800 dark:text-white">{categoryStats.length}</span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Cats</span>
                    </div>
                </div>
                
                {/* Llegenda en graella */}
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    {categoryStats.map((stat) => (
                        <div key={stat.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-default">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm ${stat.barColor}`} />
                                <span className="font-bold text-slate-600 dark:text-slate-300 text-sm">{stat.label}</span>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                    {formatCurrency(stat.amount, currency)}
                                </div>
                                <div className="text-[10px] font-bold text-slate-400">
                                    {Math.round(stat.percentage)}%
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* LLISTA DE BALANÇOS */}
        <section className="space-y-4">
            <h3 className="text-xl font-black text-slate-800 dark:text-white px-2">Estat dels Comptes</h3>
            <div className="grid gap-4">
                {balances.map((balance) => {
                    const isPositive = balance.amount > ZERO;
                    const isZero = balance.amount === ZERO;
                    const user = userMap[balance.userId];

                    return (
                        <div key={balance.userId} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between transition-transform hover:scale-[1.01]">
                            <div className="flex items-center gap-4">
                                <div className={`
                                    w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border-2
                                    ${isZero 
                                        ? 'border-slate-100 dark:border-slate-800 bg-slate-50' 
                                        : isPositive 
                                            ? 'border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-900/10' 
                                            : 'border-rose-100 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-900/10'}
                                `}>
                                    {user?.photoUrl ? (
                                      <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className={`text-sm font-bold ${isZero ? 'text-slate-400' : isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {user?.name?.charAt(0).toUpperCase() || '?'}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 dark:text-white text-base">
                                        {user?.name || 'Usuari Desconegut'}
                                    </span>
                                    <span className={`text-[10px] uppercase font-bold tracking-wider
                                        ${isZero ? 'text-slate-400' : isPositive ? 'text-emerald-500' : 'text-rose-500'}
                                    `}>
                                        {isZero ? 'Tot quadrat' : isPositive ? 'Ha de cobrar' : 'Ha de pagar'}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="text-right">
                                <span className={`font-black text-xl tracking-tight
                                    ${isZero ? 'text-slate-300 dark:text-slate-700' : isPositive ? 'text-emerald-500' : 'text-rose-500'}
                                `}>
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