import { useMemo } from 'react';
import { Check, Wallet, ArrowUpRight, ArrowDownLeft, PieChart, TrendingUp, TrendingDown } from 'lucide-react';
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
        
        <section className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden relative">
            
            <div className="flex flex-col items-center justify-center mb-8 relative z-10 text-center">
                <div className="flex items-center gap-2 mb-2 opacity-80">
                     <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-500">
                        <Wallet size={16} strokeWidth={2.5} />
                     </div>
                     <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Despesa Total del Grup</span>
                </div>
                <div className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
                    {formatCurrency(totalExpense, currency)}
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
                <div className="flex-shrink-0 relative group">
                     <div className="w-40 h-40 transform transition-transform hover:scale-105 duration-500">
                        <DonutChart data={categoryStats} onSegmentClick={(id) => { trigger('light'); onFilterCategory?.(id); }} />
                     </div>
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                        <PieChart size={32} className="text-slate-400" />
                     </div>
                </div>
                
                <div className="flex-1 w-full grid grid-cols-2 gap-3 content-center">
                    {categoryStats.slice(0, 6).map((stat) => (
                        <button 
                            key={stat.id} 
                            onClick={() => { trigger('light'); onFilterCategory?.(stat.id); }}
                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all group text-left w-full"
                        >
                            <div className="w-3 h-3 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900 flex-shrink-0" style={{ backgroundColor: stat.color }} />
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase truncate w-full group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                                    {stat.label}
                                </span>
                                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm tabular-nums">
                                    {Math.round(stat.percentage)}%
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </section>

        <section className="space-y-4">
            <h3 className="px-4 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                Estat de comptes
                <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1 rounded-full" />
            </h3>
            
            <div className="grid gap-4">
                {sortedBalances.map((balance, idx) => {
                    const amountVal = unbrand(balance.amount);
                    const isPositive = amountVal > 0;
                    const isZero = Math.abs(amountVal) < 1;
                    const user = userMap[balance.userId];
                    const userName = user?.name || 'Usuari';
                    
                    const animStyle = { animationDelay: `${idx * 75}ms` };

                    if (isZero) {
                        return (
                            <div key={balance.userId} style={animStyle} className="flex items-center justify-between px-5 py-4 rounded-3xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 opacity-60 hover:opacity-100 transition-opacity animate-fade-in-up">
                                <div className="flex items-center gap-3 grayscale">
                                    <Avatar name={userName} photoUrl={user?.photoUrl} size="sm" />
                                    <span className="font-bold text-slate-500 text-sm">{userName}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-200/50 dark:bg-slate-800 px-2 py-1 rounded-full">
                                    <Check size={12} strokeWidth={3} /> Al dia
                                </div>
                            </div>
                        );
                    }

                    if (!isPositive) {
                         return (
                            <div key={balance.userId} style={animStyle} className="relative overflow-hidden p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm animate-fade-in-up group">
                                <div className="absolute left-0 top-4 bottom-4 w-1.5 rounded-r-full bg-rose-500" />
                                
                                <div className="flex items-center justify-between pl-3">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <Avatar name={userName} photoUrl={user?.photoUrl} size="md" className="ring-2 ring-white dark:ring-slate-900 shadow-sm" />
                                            <div className="absolute -bottom-1 -right-1 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full p-1 shadow-sm border border-white dark:border-slate-900">
                                                <ArrowDownLeft size={10} strokeWidth={4} />
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base leading-tight">{userName}</h4>
                                            <div className="flex items-center gap-1 mt-0.5 text-rose-600 dark:text-rose-400">
                                                <TrendingDown size={12} />
                                                <p className="text-[10px] font-bold uppercase tracking-wide">Ha de pagar</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-black text-xl sm:text-2xl tracking-tight tabular-nums text-rose-600 dark:text-rose-500">
                                            {formatCurrency(balance.amount, currency)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={balance.userId} style={animStyle} className="relative overflow-hidden p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm animate-fade-in-up group">
                             <div className="absolute left-0 top-4 bottom-4 w-1.5 rounded-r-full bg-emerald-500" />
                            
                            <div className="flex items-center justify-between pl-3">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <Avatar name={userName} photoUrl={user?.photoUrl} size="md" className="ring-2 ring-white dark:ring-slate-900 shadow-sm" />
                                        <div className="absolute -bottom-1 -right-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full p-1 shadow-sm border border-white dark:border-slate-900">
                                            <ArrowUpRight size={10} strokeWidth={4} />
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight">{userName}</h4>
                                        <div className="flex items-center gap-1 mt-0.5 text-emerald-600 dark:text-emerald-400">
                                            <TrendingUp size={12} />
                                            <p className="text-[10px] font-bold uppercase tracking-wide">Li deuen</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block font-black text-xl sm:text-2xl tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
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