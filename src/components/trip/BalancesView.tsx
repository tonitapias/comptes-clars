import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, CheckCircle2, PieChart } from 'lucide-react';
import DonutChart from '../DonutChart';
import Avatar from '../Avatar';
import { Balance, CategoryStat, TripUser, toCents } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useTrip } from '../../context/TripContext';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

interface BalancesViewProps {
  balances: Balance[];
  categoryStats: CategoryStat[];
  onFilterCategory?: (categoryId: string) => void;
}

export default function BalancesView({ balances, categoryStats, onFilterCategory }: BalancesViewProps) {
  const { tripData } = useTrip();
  const { trigger } = useHapticFeedback();
  
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

  // Ordenem balanços: Primer qui ha de pagar (més urgent), després qui cobra, finalment qui està en pau
  const sortedBalances = useMemo(() => {
    return [...balances].sort((a, b) => a.amount - b.amount);
  }, [balances]);

  return (
    <div className="space-y-6 animate-fade-in pb-24">
        
        {/* --- SECCIÓ 1: GRÀFIC (DASHBOARD CARD) --- */}
        <section 
            className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800"
            aria-label="Gràfic de despeses"
        >
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                <PieChart size={14} strokeWidth={2.5} /> Distribució de la Despesa
            </h3>
            
            <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Chart Ring */}
                <div className="relative flex-shrink-0">
                    <div className="transform scale-100 hover:scale-105 transition-transform duration-500">
                         <DonutChart data={categoryStats} onSegmentClick={(id) => { trigger('light'); onFilterCategory?.(id); }} />
                    </div>
                    {/* Center Text Decor */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-2xl opacity-10 font-black text-slate-400">€</span>
                    </div>
                </div>
                
                {/* Smart Grid Legend */}
                <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-2 md:grid-cols-1 gap-3">
                    {categoryStats.map((stat) => (
                        <button 
                            key={stat.id} 
                            onClick={() => { trigger('light'); onFilterCategory?.(stat.id); }}
                            className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700 w-full text-left active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-3 h-3 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900 shrink-0 ${stat.barColor}`} />
                                <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-xs sm:text-sm truncate pr-1">
                                        {stat.label}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">
                                        {Math.round(stat.percentage)}%
                                    </span>
                                </div>
                            </div>
                            
                            <div className="text-right pl-2">
                                <div className="font-black text-slate-800 dark:text-slate-100 text-sm tabular-nums tracking-tight">
                                    {formatCurrency(stat.amount, currency)}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </section>

        {/* --- SECCIÓ 2: BALANÇOS (PLAYER CARDS) --- */}
        <section className="space-y-4">
            <h3 className="px-2 text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Estat dels Comptes
            </h3>
            
            <div className="grid gap-4">
                {sortedBalances.map((balance) => {
                    const isPositive = balance.amount > ZERO;
                    const isZero = balance.amount === ZERO;
                    const user = userMap[balance.userId];
                    const userName = user?.name || 'Usuari';

                    // 1. ESTAT: EN PAU (Compacte i gris)
                    if (isZero) {
                        return (
                            <div key={balance.userId} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                                <Avatar name={userName} photoUrl={user?.photoUrl} size="md" className="ring-2 ring-slate-200 dark:ring-slate-700" />
                                <div className="flex-1 flex items-center justify-between">
                                    <span className="font-bold text-slate-500 dark:text-slate-400">{userName}</span>
                                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wide">
                                        <CheckCircle2 size={12} strokeWidth={2.5} /> En pau
                                    </span>
                                </div>
                            </div>
                        );
                    }

                    // 2. ESTAT: DEUTE / CRÈDIT (Card destacada)
                    return (
                        <div 
                            key={balance.userId} 
                            className={`
                                relative overflow-hidden p-5 rounded-[1.75rem] border transition-all group
                                ${isPositive 
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30' 
                                    : 'bg-white dark:bg-slate-900 border-rose-100 dark:border-rose-900/30 shadow-lg shadow-rose-100/50 dark:shadow-none'}
                            `}
                        >
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <Avatar 
                                            name={userName} 
                                            photoUrl={user?.photoUrl} 
                                            size="lg"
                                            className={isPositive ? 'ring-4 ring-emerald-100 dark:ring-emerald-900' : 'ring-4 ring-rose-50 dark:ring-rose-900'} 
                                        />
                                        <div className={`
                                            absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm
                                            ${isPositive ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}
                                        `}>
                                            {isPositive 
                                                ? <TrendingUp size={12} strokeWidth={3} /> 
                                                : <TrendingDown size={12} strokeWidth={3} />}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h4 className="font-black text-lg text-slate-800 dark:text-slate-100 leading-none mb-1.5">
                                            {userName}
                                        </h4>
                                        <p className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {isPositive ? 'Ha de cobrar' : 'Ha de pagar'}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className={`
                                        block font-black text-2xl sm:text-3xl tracking-tighter tabular-nums
                                        ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
                                    `}>
                                        {isPositive ? '+' : ''}{formatCurrency(balance.amount, currency)}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Decorative Background Blur (Efecte Glow) */}
                            <div className={`
                                absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none transition-opacity group-hover:opacity-30
                                ${isPositive ? 'bg-emerald-400' : 'bg-rose-400'}
                            `} />
                        </div>
                    );
                })}
            </div>
        </section>
    </div>
  );
}