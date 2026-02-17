import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Check, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import DonutChart from '../DonutChart';
import Avatar from '../Avatar';
import { Balance, CategoryStat, TripUser, toCents, unbrand } from '../../types';
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

  // Ordenem balanços: Deutors primer (negatiu), creditors després (positiu)
  const sortedBalances = useMemo(() => {
    return [...balances].sort((a, b) => unbrand(a.amount) - unbrand(b.amount));
  }, [balances]);

  // Calculem el total de despesa per mostrar-lo de forma segura
  const totalExpense = useMemo(() => 
    toCents(categoryStats.reduce((acc, curr) => acc + unbrand(curr.amount), 0)),
  [categoryStats]);

  return (
    <div className="space-y-8 animate-fade-in pb-24">
        
        {/* --- SECCIÓ 1: DASHBOARD (Format que t'agradava) --- */}
        <section 
            className="bg-white dark:bg-slate-900/50 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden"
        >
            <div className="relative z-10">
                {/* Header del Dashboard amb el Total Net */}
                <div className="flex items-end justify-between mb-8 px-1">
                    <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5">
                            <Wallet size={12} /> Despesa Total
                        </h3>
                        <div className="text-3xl font-black text-slate-800 dark:text-white tabular-nums tracking-tighter">
                            {formatCurrency(totalExpense, currency)}
                        </div>
                    </div>
                    <div className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-full uppercase tracking-wider">
                        Estadístiques
                    </div>
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Gràfic: Ara sense text intern per evitar solapaments */}
                    <div 
                        className="relative flex-shrink-0 group cursor-pointer" 
                        onClick={() => trigger('light')}
                    >
                        <div className="transform scale-110 transition-transform duration-500 ease-out drop-shadow-xl">
                             <DonutChart data={categoryStats} onSegmentClick={(id) => { trigger('light'); onFilterCategory?.(id); }} />
                        </div>
                    </div>
                    
                    {/* Llegenda en Graella (2 columnes) com t'agradava */}
                    <div className="w-full grid grid-cols-2 gap-3">
                        {categoryStats.map((stat) => (
                            <button 
                                key={stat.id} 
                                onClick={() => { trigger('light'); onFilterCategory?.(stat.id); }}
                                className="group flex flex-col justify-center p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 w-full text-left active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stat.color }} />
                                    <span className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase truncate">
                                        {stat.label}
                                    </span>
                                </div>
                                
                                <div className="flex items-baseline gap-1">
                                    <span className="font-black text-slate-800 dark:text-slate-100 text-sm tabular-nums tracking-tight">
                                        {formatCurrency(stat.amount, currency).split(',')[0]}
                                    </span>
                                    <span className="text-[9px] font-black text-primary opacity-60">
                                        {Math.round(stat.percentage)}%
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </section>

        {/* --- SECCIÓ 2: BALANÇOS (Targetes Premium) --- */}
        <section className="space-y-4">
            <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Balanç Detallat
            </h3>
            
            <div className="grid gap-4">
                {sortedBalances.map((balance, idx) => {
                    const amountVal = unbrand(balance.amount);
                    const isPositive = amountVal > 0;
                    const isZero = Math.abs(amountVal) < 1;
                    const user = userMap[balance.userId];
                    const userName = user?.name || 'Usuari';
                    const animDelay = { animationDelay: `${idx * 80}ms` };

                    // 1. ESTAT: EN PAU
                    if (isZero) {
                        return (
                            <div key={balance.userId} style={animDelay} className="flex items-center justify-between px-6 py-4 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800/50 opacity-60 animate-fade-in-up">
                                <div className="flex items-center gap-3">
                                    <Avatar name={userName} photoUrl={user?.photoUrl} size="sm" className="grayscale opacity-50" />
                                    <span className="font-bold text-slate-500 text-sm">{userName}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-wider bg-slate-200/50 dark:bg-slate-800 px-3 py-1 rounded-full">
                                    <Check size={10} strokeWidth={3} /> Liquidat
                                </div>
                            </div>
                        );
                    }

                    // 2. ESTAT: DEUTE (Targeta Blanca/Vermella)
                    if (!isPositive) {
                         return (
                            <div key={balance.userId} style={animDelay} className="group relative overflow-hidden p-0 rounded-[2rem] bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 animate-fade-in-up hover:shadow-md transition-all">
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500" />
                                <div className="p-5 pl-7 flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <Avatar name={userName} photoUrl={user?.photoUrl} size="md" className="ring-4 ring-rose-50 dark:ring-rose-900/20" />
                                            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 text-rose-500 rounded-full p-0.5 shadow-sm">
                                                <ArrowDownLeft size={14} strokeWidth={3} />
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-base text-slate-700 dark:text-slate-200 leading-tight">{userName}</h4>
                                            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mt-0.5">Ha de pagar</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-black text-2xl tracking-tight tabular-nums text-rose-600 dark:text-rose-500">
                                            {formatCurrency(balance.amount, currency)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // 3. ESTAT: CRÈDIT (Targeta Premium Verda)
                    return (
                        <div key={balance.userId} style={animDelay} className="relative overflow-hidden p-6 rounded-[2rem] bg-gradient-to-br from-emerald-800 to-teal-900 text-white shadow-lg shadow-emerald-900/20 transform transition-all hover:scale-[1.01] animate-fade-in-up">
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, white 0%, transparent 25%)' }} />
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <Avatar name={userName} photoUrl={user?.photoUrl} size="md" className="ring-2 ring-white/20 shadow-lg" />
                                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                                            <ArrowUpRight size={14} strokeWidth={3} />
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-base text-white leading-tight">{userName}</h4>
                                        <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-wider mt-0.5 opacity-80">Ha de recuperar</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block font-black text-2xl tracking-tight tabular-nums text-white text-shadow-sm">
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