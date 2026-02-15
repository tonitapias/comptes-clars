import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, CheckCircle2, PieChart, ArrowRight } from 'lucide-react';
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
    <div className="space-y-8 animate-fade-in pb-24">
        
        {/* --- SECCIÓ 1: GRÀFIC (DASHBOARD CARD) --- */}
        <section 
            className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-financial-sm border border-slate-200 dark:border-slate-800"
            aria-label="Gràfic de despeses"
        >
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                <PieChart size={14} strokeWidth={2.5} /> Distribució de la Despesa
            </h3>
            
            <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Chart Ring */}
                <div className="relative flex-shrink-0 group cursor-pointer" onClick={() => trigger('light')}>
                    <div className="transform scale-100 group-hover:scale-105 transition-transform duration-500 ease-out">
                         <DonutChart data={categoryStats} onSegmentClick={(id) => { trigger('light'); onFilterCategory?.(id); }} />
                    </div>
                    {/* Center Text Decor */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-2xl opacity-10 font-black text-slate-400 dark:text-slate-600 transition-opacity group-hover:opacity-20">€</span>
                    </div>
                </div>
                
                {/* Smart Grid Legend */}
                <div className="flex-1 w-full grid grid-cols-2 gap-3">
                    {categoryStats.map((stat) => (
                        <button 
                            key={stat.id} 
                            onClick={() => { trigger('light'); onFilterCategory?.(stat.id); }}
                            className="group flex flex-col justify-center p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700 w-full text-left active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`w-2 h-2 rounded-full shadow-sm ring-1 ring-white dark:ring-slate-900 shrink-0 ${stat.barColor}`} />
                                <span className="font-bold text-slate-600 dark:text-slate-300 text-xs truncate">
                                    {stat.label}
                                </span>
                            </div>
                            
                            <div className="flex items-baseline gap-1.5">
                                <span className="font-black text-slate-800 dark:text-slate-100 text-sm tabular-nums tracking-tight">
                                    {formatCurrency(stat.amount, currency)}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">
                                    {Math.round(stat.percentage)}%
                                </span>
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
            
            <div className="grid gap-3">
                {sortedBalances.map((balance) => {
                    const isPositive = balance.amount > ZERO;
                    const isZero = balance.amount === ZERO;
                    const user = userMap[balance.userId];
                    const userName = user?.name || 'Usuari';

                    // 1. ESTAT: EN PAU (Minimalista)
                    if (isZero) {
                        return (
                            <div key={balance.userId} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/50 opacity-60 hover:opacity-100 transition-opacity">
                                <Avatar name={userName} photoUrl={user?.photoUrl} size="md" className="grayscale opacity-80" />
                                <div className="flex-1 flex items-center justify-between">
                                    <span className="font-bold text-slate-500 dark:text-slate-500">{userName}</span>
                                    <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-600 text-[11px] font-black uppercase tracking-wider">
                                        <CheckCircle2 size={14} /> En pau
                                    </span>
                                </div>
                            </div>
                        );
                    }

                    // 2. ESTAT: DEUTE (Urgent - Estil Ticket/Alerta)
                    if (!isPositive) {
                         return (
                            <div 
                                key={balance.userId} 
                                className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-slate-900 border-l-4 border-l-rose-500 border-y border-r border-slate-100 dark:border-slate-800 shadow-sm group"
                            >
                                {/* FIX: Utilitzem CSS Gradient natiu per evitar errors de URL/Base64 */}
                                <div 
                                    className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none z-0" 
                                    style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 1px, transparent 6px)' }}
                                />
                                
                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <Avatar 
                                                name={userName} 
                                                photoUrl={user?.photoUrl} 
                                                size="lg"
                                                className="ring-2 ring-rose-100 dark:ring-rose-900/50" 
                                            />
                                            <div className="absolute -bottom-1 -right-1 bg-rose-500 text-white w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                                                <TrendingDown size={10} strokeWidth={3} />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <h4 className="font-black text-lg text-slate-800 dark:text-slate-100 leading-none mb-1">
                                                {userName}
                                            </h4>
                                            <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-wider">
                                                <span>Ha de pagar</span>
                                                <ArrowRight size={12} strokeWidth={2.5} className="opacity-50 group-hover:translate-x-0.5 transition-transform" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <span className="block font-black text-3xl tracking-tighter tabular-nums text-rose-600 dark:text-rose-500">
                                            {formatCurrency(balance.amount, currency)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // 3. ESTAT: CRÈDIT (Solid - Estil Targeta VIP)
                    return (
                        <div 
                            key={balance.userId} 
                            className="relative overflow-hidden p-5 rounded-2xl bg-emerald-600 dark:bg-emerald-700 text-white shadow-financial-md shadow-emerald-900/20 group transform transition-all hover:translate-y-[-2px]"
                        >
                            {/* Gradient subtil */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <Avatar 
                                            name={userName} 
                                            photoUrl={user?.photoUrl} 
                                            size="lg"
                                            className="ring-2 ring-white/30" 
                                        />
                                        <div className="absolute -bottom-1 -right-1 bg-white text-emerald-600 w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                                            <TrendingUp size={10} strokeWidth={3} />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h4 className="font-black text-lg text-white leading-none mb-1">
                                            {userName}
                                        </h4>
                                        <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider opacity-90">
                                            Ha de cobrar
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className="block font-black text-3xl tracking-tighter tabular-nums text-white text-shadow-sm">
                                        +{formatCurrency(balance.amount, currency)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    </div>
  );
}