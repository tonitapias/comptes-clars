import React, { useMemo } from 'react';
import DonutChart from '../DonutChart';
import { Balance, CategoryStat, TripUser, toCents } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useTrip } from '../../context/TripContext';
import { getAvatarColor } from '../../utils/ui';
import { ChevronRight } from 'lucide-react';

interface BalancesViewProps {
  balances: Balance[];
  categoryStats: CategoryStat[];
  onFilterCategory?: (categoryId: string) => void;
}

export default function BalancesView({ balances, categoryStats, onFilterCategory }: BalancesViewProps) {
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
        
        {/* --- SECCIÓ 1: GRÀFIC INTERACTIU --- */}
        <section className="bg-surface-card p-6 rounded-[2rem] shadow-financial-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-black text-content-body mb-8 flex items-center gap-2">
                <span className="text-xl">📊</span> Distribució de Despeses
            </h3>
            
            <div className="flex flex-col md:flex-row items-center gap-10">
                {/* Chart Container */}
                <div className="flex-shrink-0">
                    <DonutChart data={categoryStats} onSegmentClick={onFilterCategory} />
                </div>
                
                {/* Interactive Legend List */}
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    {categoryStats.map((stat) => (
                        <button 
                            key={stat.id} 
                            onClick={() => onFilterCategory?.(stat.id)}
                            className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-ground transition-all group w-full text-left border border-transparent hover:border-slate-100 dark:hover:border-slate-700 active:scale-[0.98]"
                            title={`Veure despeses de ${stat.label}`}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-3 h-3 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900 shrink-0 ${stat.barColor}`} />
                                <span className="font-bold text-content-muted text-sm group-hover:text-content-body transition-colors truncate">
                                    {stat.label}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 pl-2">
                                <div className="text-right">
                                    <div className="font-bold text-content-body text-sm tabular-nums">
                                        {formatCurrency(stat.amount, currency)}
                                    </div>
                                    <div className="text-[10px] font-bold text-content-subtle">
                                        {Math.round(stat.percentage)}%
                                    </div>
                                </div>
                                {/* Fletxa indicadora d'acció */}
                                <ChevronRight size={14} className="text-content-subtle opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </section>

        {/* --- SECCIÓ 2: ESTAT DELS COMPTES --- */}
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
                    const avatarClasses = isZero 
                        ? 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700 grayscale'
                        : getAvatarColor(userName);

                    return (
                        <div key={balance.userId} className="group bg-surface-card p-4 sm:p-5 rounded-3xl shadow-financial-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between transition-all hover:shadow-financial-md">
                            <div className="flex items-center gap-4">
                                <div className={`
                                    w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden border-2 transition-transform group-hover:scale-105 shadow-sm
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
                                <div className="flex flex-col gap-1"> 
                                    <span className="font-bold text-content-body text-lg leading-tight">{userName}</span>
                                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-lg w-fit ${isZero ? 'bg-slate-100 text-slate-400 dark:bg-slate-800' : isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                                        {isZero ? 'Està en pau' : isPositive ? 'Ha de cobrar' : 'Ha de pagar'}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right pl-2">
                                <span className={`font-black text-xl sm:text-2xl tracking-tight tabular-nums ${isZero ? 'text-content-subtle opacity-50' : isPositive ? 'text-status-success' : 'text-status-error'}`}>
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