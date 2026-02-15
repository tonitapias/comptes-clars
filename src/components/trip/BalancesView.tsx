import React, { useMemo } from 'react';
import DonutChart from '../DonutChart';
import { Balance, CategoryStat, TripUser, toCents } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useTrip } from '../../context/TripContext';
import { ChevronRight, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';
import Avatar from '../Avatar'; // Import arreglat

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
    <div className="space-y-8 animate-fade-in pb-24">
        
        {/* --- SECCIÓ 1: GRÀFIC INTERACTIU --- */}
        <section 
            className="bg-surface-card p-6 md:p-8 rounded-[2.5rem] shadow-financial-md border border-slate-100 dark:border-slate-800"
            aria-label="Gràfic de distribució de despeses"
        >
            <h3 className="text-xl font-black text-content-body mb-8 flex items-center gap-3">
                <span className="text-2xl" role="img" aria-hidden="true">📊</span> 
                Distribució de Despeses
            </h3>
            
            <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="flex-shrink-0 transform hover:scale-105 transition-transform duration-500">
                    <DonutChart data={categoryStats} onSegmentClick={onFilterCategory} />
                </div>
                
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    {categoryStats.map((stat) => (
                        <button 
                            key={stat.id} 
                            onClick={() => onFilterCategory?.(stat.id)}
                            className="group flex items-center justify-between p-3 min-h-[52px] rounded-2xl hover:bg-surface-ground transition-all w-full text-left border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]"
                            title={`Filtrar per ${stat.label}`}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-4 h-4 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900 shrink-0 ${stat.barColor}`} />
                                <span className="font-bold text-content-muted text-sm group-hover:text-content-body transition-colors truncate">
                                    {stat.label}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 pl-2">
                                <div className="text-right">
                                    <div className="font-black text-content-body text-sm tabular-nums">
                                        {formatCurrency(stat.amount, currency)}
                                    </div>
                                    <div className="text-[10px] font-bold text-content-subtle">
                                        {Math.round(stat.percentage)}%
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-content-subtle opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" aria-hidden="true" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </section>

        {/* --- SECCIÓ 2: BALANÇOS --- */}
        <section className="space-y-4">
            <h3 className="text-xl font-black text-content-body px-2 flex items-center gap-3">
                <span className="text-2xl" role="img" aria-hidden="true">⚖️</span> 
                Balanços
            </h3>
            <div className="grid gap-4">
                {balances.map((balance) => {
                    const isPositive = balance.amount > ZERO;
                    const isZero = balance.amount === ZERO;
                    const user = userMap[balance.userId];
                    const userName = user?.name || 'Usuari Desconegut';
                    
                    return (
                        <div 
                            key={balance.userId} 
                            className="group bg-surface-card p-5 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between transition-all hover:shadow-financial-md hover:border-slate-200 dark:hover:border-slate-700"
                        >
                            <div className="flex items-center gap-4 sm:gap-5">
                                <Avatar
                                    name={userName}
                                    photoUrl={user?.photoUrl}
                                    size="xl"
                                    className={`transition-transform group-hover:scale-105 border-2 ${isZero ? 'grayscale opacity-70' : ''}`}
                                />
                                
                                <div className="flex flex-col gap-1.5"> 
                                    <span className="font-black text-content-body text-lg leading-tight">{userName}</span>
                                    
                                    <div className={`
                                        inline-flex items-center gap-1.5 px-3 py-1 rounded-full w-fit border text-xs font-bold uppercase tracking-wide
                                        ${isZero 
                                            ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' 
                                            : isPositive 
                                                ? 'bg-status-success/10 text-status-success border-status-success/20 dark:bg-status-success/20 dark:border-status-success/30' 
                                                : 'bg-status-error/10 text-status-error border-status-error/20 dark:bg-status-error/20 dark:border-status-error/30'}
                                    `}>
                                        {isZero ? (
                                            <><CheckCircle2 size={12} strokeWidth={3} aria-hidden="true" /> Està en pau</>
                                        ) : isPositive ? (
                                            <><TrendingUp size={12} strokeWidth={3} aria-hidden="true" /> Ha de cobrar</>
                                        ) : (
                                            <><TrendingDown size={12} strokeWidth={3} aria-hidden="true" /> Ha de pagar</>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="text-right pl-2">
                                <span className={`
                                    font-black text-2xl sm:text-3xl tracking-tighter tabular-nums block
                                    ${isZero 
                                        ? 'text-slate-300 dark:text-slate-700' 
                                        : isPositive 
                                            ? 'text-status-success' 
                                            : 'text-status-error'}
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