// src/components/trip/BalancesView.tsx
import React, { useMemo } from 'react';
import DonutChart from '../DonutChart';
import { Balance, CategoryStat, TripUser, toCents } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useTrip } from '../../context/TripContext';

interface BalancesViewProps {
  balances: Balance[];
  categoryStats: CategoryStat[];
}

// Helper per generar color consistent basat en el nom (Identitat)
const getAvatarColor = (name: string) => {
  const colors = [
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800', 
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800', 
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', 
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200 dark:border-pink-800',
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

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
    <div className="space-y-6 animate-fade-in pb-24">
        
        {/* --- SECCIÓ 1: GRÀFIC DE DESPESES --- */}
        <section className="bg-surface-card p-5 sm:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-black text-content-body mb-6 flex items-center gap-2">
                <span className="text-xl">📊</span> Distribució
            </h3>
            
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                {/* Chart Container */}
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex-shrink-0">
                    <DonutChart data={categoryStats} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-black text-content-body tracking-tighter">
                            {categoryStats.length}
                        </span>
                        <span className="text-[10px] font-bold text-content-subtle uppercase tracking-widest">Cats</span>
                    </div>
                </div>
                
                {/* Legend List */}
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                    {categoryStats.map((stat) => (
                        <div key={stat.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-ground transition-colors group cursor-default">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900 ${stat.barColor}`} />
                                <span className="font-bold text-content-muted text-sm group-hover:text-content-body transition-colors">
                                    {stat.label}
                                </span>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-content-body text-sm tabular-nums">
                                    {formatCurrency(stat.amount, currency)}
                                </div>
                                <div className="text-[10px] font-bold text-content-subtle">
                                    {Math.round(stat.percentage)}%
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* --- SECCIÓ 2: ESTAT DELS COMPTES (Balances) --- */}
        <section className="space-y-4">
            <h3 className="text-lg font-black text-content-body px-2 flex items-center gap-2">
                <span className="text-xl">⚖️</span> Balanços
            </h3>
            <div className="grid gap-3">
                {balances.map((balance) => {
                    const isPositive = balance.amount > ZERO;
                    const isZero = balance.amount === ZERO;
                    const user = userMap[balance.userId];
                    const userName = user?.name || 'Usuari Desconegut';

                    // LÒGICA NOVA: Color consistent vs Gris si és zero
                    const avatarClasses = isZero 
                        ? 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700 grayscale'
                        : getAvatarColor(userName);

                    return (
                        <div key={balance.userId} className="group bg-surface-card p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between transition-all hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700">
                            <div className="flex items-center gap-4">
                                {/* Avatar Large Consistent */}
                                <div className={`
                                    w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden border-2 transition-transform group-hover:scale-105
                                    ${avatarClasses}
                                `}>
                                    {user?.photoUrl ? (
                                      <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xl font-black">
                                            {user?.name?.charAt(0).toUpperCase() || '?'}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="flex flex-col gap-0.5">
                                    <span className="font-bold text-content-body text-lg leading-tight">
                                        {userName}
                                    </span>
                                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md w-fit
                                        ${isZero 
                                            ? 'bg-slate-100 text-slate-400 dark:bg-slate-800' 
                                            : isPositive 
                                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' 
                                                : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}
                                    `}>
                                        {isZero ? 'Està en pau' : isPositive ? 'Ha de cobrar' : 'Ha de pagar'}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="text-right pl-2">
                                <span className={`font-black text-xl sm:text-2xl tracking-tight tabular-nums
                                    ${isZero ? 'text-content-subtle opacity-50' : isPositive ? 'text-status-success' : 'text-status-error'}
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