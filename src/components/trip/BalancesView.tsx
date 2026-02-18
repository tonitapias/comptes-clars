import { useMemo } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, PieChart, TrendingUp, TrendingDown, Check, ChevronRight } from 'lucide-react';
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
    <div className="space-y-8 animate-fade-in pb-32 pt-2 px-1">
        
        {/* --- PREMIUM STATS CARD (Black Onyx Style) --- */}
        <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 dark:bg-black text-white shadow-2xl shadow-slate-300/40 dark:shadow-indigo-900/10 transition-transform duration-500">
            
            {/* Background Effects */}
            <div className="absolute top-[-50%] right-[-20%] w-[100%] h-[150%] bg-indigo-500/20 blur-[90px] rounded-full pointer-events-none opacity-60" />
            <div className="absolute bottom-[-30%] left-[-20%] w-[80%] h-[100%] bg-fuchsia-500/20 blur-[80px] rounded-full pointer-events-none opacity-40" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none" />

            <div className="relative z-10 p-8 flex flex-col items-center">
                
                {/* Header */}
                <div className="text-center mb-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Despesa Total
                    </span>
                    <h2 className="text-5xl font-black tracking-tighter text-white mt-1 drop-shadow-lg">
                        {formatCurrency(totalExpense, currency)}
                    </h2>
                </div>

                {/* Chart Container (Centered & Clean) */}
                <div className="relative w-56 h-56 mb-8 group">
                    {/* Outer Glow */}
                    <div className="absolute inset-4 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all duration-700" />
                    
                    <div className="relative z-10 transform transition-transform duration-700 group-hover:scale-105 group-hover:rotate-6">
                         <DonutChart data={categoryStats} onSegmentClick={(id) => { trigger('light'); onFilterCategory?.(id); }} />
                    </div>

                    {/* Center Icon */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-lg">
                            <PieChart size={20} className="text-white/80" />
                        </div>
                    </div>
                </div>

                {/* Legend List (Vertical & Clean) */}
                <div className="w-full space-y-3">
                    {categoryStats.slice(0, 4).map((stat) => (
                        <button 
                            key={stat.id} 
                            onClick={() => { trigger('light'); onFilterCategory?.(stat.id); }}
                            className="flex items-center justify-between w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all active:scale-[0.98] group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors">
                                    <div className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: stat.color, color: stat.color }} />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">
                                        {stat.label}
                                    </span>
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
                                        {formatCurrency(stat.amount, currency)}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 pr-1">
                                <span className="font-bold text-white text-sm tabular-nums">
                                    {Math.round(stat.percentage)}%
                                </span>
                                <ChevronRight size={14} className="text-slate-600 group-hover:text-white transition-colors" />
                            </div>
                        </button>
                    ))}
                    
                    {categoryStats.length > 4 && (
                        <button 
                            onClick={() => onFilterCategory?.('all')} 
                            className="w-full py-2 text-center text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-wide"
                        >
                            Veure totes les categories
                        </button>
                    )}
                </div>
            </div>
        </section>

        {/* --- BALANCES LIST (Premium Cards) --- */}
        <section className="space-y-4 pt-4">
            <h3 className="px-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 opacity-80">
                <Wallet size={12} />
                Balanç de membres
            </h3>
            
            <div className="grid gap-3">
                {sortedBalances.map((balance, idx) => {
                    const amountVal = unbrand(balance.amount);
                    const isPositive = amountVal > 0;
                    const isZero = Math.abs(amountVal) < 1;
                    const user = userMap[balance.userId];
                    const userName = user?.name || 'Usuari';
                    
                    const animStyle = { animationDelay: `${idx * 75}ms` };

                    if (isZero) {
                        return (
                            <div key={balance.userId} style={animStyle} className="flex items-center justify-between px-5 py-4 rounded-3xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 animate-fade-in-up opacity-70 grayscale hover:grayscale-0 transition-all">
                                <div className="flex items-center gap-4">
                                    <Avatar name={userName} photoUrl={user?.photoUrl} size="sm" />
                                    <span className="font-bold text-slate-500 dark:text-slate-400 text-sm">{userName}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-200/50 dark:bg-slate-800 px-3 py-1 rounded-full">
                                    <Check size={12} strokeWidth={3} /> Al dia
                                </div>
                            </div>
                        );
                    }

                    const isCreditor = isPositive;
                    
                    // Card Styling based on status
                    const themeClass = isCreditor
                        ? "bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900 border-emerald-100 dark:border-emerald-900/50"
                        : "bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-slate-900 border-rose-100 dark:border-rose-900/50";
                    
                    const textAccent = isCreditor ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400";
                    const iconBg = isCreditor ? "bg-emerald-100 dark:bg-emerald-500/20" : "bg-rose-100 dark:bg-rose-500/20";

                    return (
                        <div key={balance.userId} style={animStyle} className={`relative overflow-hidden p-1 rounded-[1.7rem] animate-fade-in-up group shadow-sm hover:shadow-md transition-all duration-300`}>
                            {/* Border Gradient Hack */}
                            <div className={`absolute inset-0 opacity-50 ${isCreditor ? 'bg-emerald-200 dark:bg-emerald-900' : 'bg-rose-200 dark:bg-rose-900'}`} />
                            
                            <div className={`relative h-full p-5 rounded-[1.6rem] border ${themeClass}`}>
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <Avatar name={userName} photoUrl={user?.photoUrl} size="md" className="ring-2 ring-white dark:ring-slate-900 shadow-md" />
                                            <div className={`absolute -bottom-1 -right-1 ${iconBg} ${textAccent} rounded-full p-1 shadow-sm border border-white dark:border-slate-900`}>
                                                {isCreditor ? <ArrowUpRight size={10} strokeWidth={3} /> : <ArrowDownLeft size={10} strokeWidth={3} />}
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">{userName}</h4>
                                            <div className={`flex items-center gap-1 mt-0.5 ${textAccent}`}>
                                                {isCreditor ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                <p className="text-[10px] font-black uppercase tracking-wide opacity-80">
                                                    {isCreditor ? 'Recupera' : 'Deu'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <span className={`block font-black text-xl sm:text-2xl tracking-tighter tabular-nums ${textAccent}`}>
                                            {isCreditor ? '+' : ''}{formatCurrency(balance.amount, currency)}
                                        </span>
                                    </div>
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