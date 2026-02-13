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
        <section className="bg-surface-card p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-black text-content-body mb-8">On van els diners?</h3>
            
            <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="relative w-56 h-56 flex-shrink-0">
                    <DonutChart data={categoryStats} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-black text-content-body">{categoryStats.length}</span>
                        <span className="text-xxs font-bold text-content-subtle uppercase tracking-wide">Cats</span>
                    </div>
                </div>
                
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    {categoryStats.map((stat) => (
                        <div key={stat.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-ground transition-colors group cursor-default">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm ${stat.barColor}`} />
                                <span className="font-bold text-content-muted text-sm">{stat.label}</span>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-content-body text-sm">
                                    {formatCurrency(stat.amount, currency)}
                                </div>
                                {/* Canvi: text-[10px] -> text-xxs + token subtle */}
                                <div className="text-xxs font-bold text-content-subtle">
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
            <h3 className="text-xl font-black text-content-body px-2">Estat dels Comptes</h3>
            <div className="grid gap-4">
                {balances.map((balance) => {
                    const isPositive = balance.amount > ZERO;
                    const isZero = balance.amount === ZERO;
                    const user = userMap[balance.userId];

                    return (
                        <div key={balance.userId} className="bg-surface-card p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between transition-transform hover:scale-[1.01]">
                            <div className="flex items-center gap-4">
                                <div className={`
                                    w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border-2
                                    ${isZero 
                                        ? 'border-slate-100 dark:border-slate-800 bg-surface-ground' 
                                        : isPositive 
                                            ? 'border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-900/10' 
                                            : 'border-rose-100 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-900/10'}
                                `}>
                                    {user?.photoUrl ? (
                                      <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className={`text-sm font-bold ${isZero ? 'text-content-subtle' : isPositive ? 'text-status-success' : 'text-status-error'}`}>
                                            {user?.name?.charAt(0).toUpperCase() || '?'}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="flex flex-col">
                                    <span className="font-bold text-content-body text-base">
                                        {user?.name || 'Usuari Desconegut'}
                                    </span>
                                    {/* Canvi: text-[10px] -> text-xxs */}
                                    <span className={`text-xxs uppercase font-bold tracking-wider
                                        ${isZero ? 'text-content-subtle' : isPositive ? 'text-status-success' : 'text-status-error'}
                                    `}>
                                        {isZero ? 'Tot quadrat' : isPositive ? 'Ha de cobrar' : 'Ha de pagar'}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="text-right">
                                <span className={`font-black text-xl tracking-tight
                                    ${isZero ? 'text-content-subtle' : isPositive ? 'text-status-success' : 'text-status-error'}
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