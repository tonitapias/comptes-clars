import React, { useMemo } from 'react';
import { Check, Wallet, ArrowUpRight, ArrowDownLeft, PieChart } from 'lucide-react';
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

  // Ordenem: Primer Deutors (negatiu), després Creditors (positiu), finalment Liquidats (0)
  const sortedBalances = useMemo(() => {
    return [...balances].sort((a, b) => {
        const valA = unbrand(a.amount);
        const valB = unbrand(b.amount);
        if (Math.abs(valA) < 1 && Math.abs(valB) >= 1) return 1;
        if (Math.abs(valA) >= 1 && Math.abs(valB) < 1) return -1;
        return valA - valB;
    });
  }, [balances]);

  const totalExpense = useMemo(() => 
    toCents(categoryStats.reduce((acc, curr) => acc + unbrand(curr.amount), 0)),
  [categoryStats]);

  return (
    <div className="space-y-6 animate-fade-in pb-24">
        
        {/* --- SECCIÓ 1: DASHBOARD COMPACTE --- */}
        <section className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden relative">
            {/* Header: Total */}
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-1 opacity-60">
                         <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <Wallet size={14} className="text-slate-500 dark:text-slate-300" />
                         </div>
                         <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Despesa Global</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                        {formatCurrency(totalExpense, currency)}
                    </div>
                </div>
                {/* Visual Decoratiu */}
                <div className="absolute right-0 top-0 opacity-5 dark:opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
                    <PieChart size={120} />
                </div>
            </div>
            
            {/* Content: Chart + Legend */}
            <div className="flex flex-col sm:flex-row gap-6 relative z-10">
                {/* Chart Reduït */}
                <div className="flex-shrink-0 flex justify-center py-2">
                     <div className="w-32 h-32 sm:w-40 sm:h-40 transform transition-transform hover:scale-105 active:scale-95 duration-300">
                        <DonutChart data={categoryStats} onSegmentClick={(id) => { trigger('light'); onFilterCategory?.(id); }} />
                     </div>
                </div>
                
                {/* Llegenda Compacta */}
                <div className="flex-1 grid grid-cols-2 gap-2 content-center">
                    {categoryStats.slice(0, 6).map((stat) => ( // Limitem a 6 per no saturar
                        <button 
                            key={stat.id} 
                            onClick={() => { trigger('light'); onFilterCategory?.(stat.id); }}
                            className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left group"
                        >
                            <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: stat.color }} />
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase truncate w-full group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                                    {stat.label}
                                </span>
                                <span className="font-bold text-slate-700 dark:text-slate-200 text-xs tabular-nums">
                                    {Math.round(stat.percentage)}%
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </section>

        {/* --- SECCIÓ 2: BALANÇOS --- */}
        <section className="space-y-3">
            <h3 className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Estat de comptes
            </h3>
            
            <div className="grid gap-3">
                {sortedBalances.map((balance, idx) => {
                    const amountVal = unbrand(balance.amount);
                    const isPositive = amountVal > 0;
                    const isZero = Math.abs(amountVal) < 1;
                    const user = userMap[balance.userId];
                    const userName = user?.name || 'Usuari';
                    
                    // Delay animació escalat
                    const animStyle = { animationDelay: `${idx * 50}ms` };

                    // A. LIQUIDAT (Subtil)
                    if (isZero) {
                        return (
                            <div key={balance.userId} style={animStyle} className="flex items-center justify-between px-5 py-3 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-transparent dark:border-slate-800 opacity-50 animate-fade-in-up">
                                <div className="flex items-center gap-3 grayscale">
                                    <Avatar name={userName} photoUrl={user?.photoUrl} size="sm" />
                                    <span className="font-bold text-slate-500 text-sm">{userName}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                    <Check size={12} strokeWidth={3} /> Al dia
                                </div>
                            </div>
                        );
                    }

                    // B. DEUTE (Clean Red)
                    if (!isPositive) {
                         return (
                            <div key={balance.userId} style={animStyle} className="relative overflow-hidden p-5 rounded-3xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/30 shadow-sm animate-fade-in-up">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <Avatar name={userName} photoUrl={user?.photoUrl} size="md" className="ring-4 ring-rose-50 dark:ring-rose-900/20" />
                                            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 text-rose-500 rounded-full p-0.5 shadow-sm border border-rose-100 dark:border-rose-900">
                                                <ArrowDownLeft size={12} strokeWidth={4} />
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-200">{userName}</h4>
                                            <p className="text-[10px] font-bold text-rose-500/80 uppercase tracking-wide">Ha de pagar</p>
                                        </div>
                                    </div>
                                    <span className="font-black text-xl tracking-tight tabular-nums text-rose-600 dark:text-rose-500">
                                        {formatCurrency(balance.amount, currency)}
                                    </span>
                                </div>
                            </div>
                        );
                    }

                    // C. CRÈDIT (Clean Green)
                    return (
                        <div key={balance.userId} style={animStyle} className="relative overflow-hidden p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 shadow-sm animate-fade-in-up">
                             <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <Avatar name={userName} photoUrl={user?.photoUrl} size="md" className="ring-4 ring-emerald-100 dark:ring-emerald-900/30" />
                                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 text-emerald-600 rounded-full p-0.5 shadow-sm border border-emerald-100 dark:border-emerald-900">
                                            <ArrowUpRight size={12} strokeWidth={4} />
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 dark:text-slate-100">{userName}</h4>
                                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Recupera</p>
                                    </div>
                                </div>
                                <span className="font-black text-xl tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
                                    +{formatCurrency(balance.amount, currency)}
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