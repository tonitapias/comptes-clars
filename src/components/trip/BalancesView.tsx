import React from 'react';
import DonutChart from '../DonutChart';
import { Balance, CategoryStat } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useTrip } from '../../context/TripContext'; // <--- NOU

interface BalancesViewProps {
  balances: Balance[];
  categoryStats: CategoryStat[];
  // currency i users ELIMINATS (les agafem del context)
}

export default function BalancesView({ balances, categoryStats }: BalancesViewProps) {
  const { tripData } = useTrip();
  if (!tripData) return null;
  const { users, currency } = tripData;

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || id;

  return (
    <div className="space-y-6 animate-fade-in">
        {/* Gràfic de Categories */}
        <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-6">Per Categories</h3>
            <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-48 h-48 shrink-0 relative">
                    <DonutChart data={categoryStats} />
                </div>
                <div className="flex-1 w-full space-y-3">
                    {categoryStats.map(stat => (
                        <div key={stat.id} className="flex items-center justify-between text-sm group">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${stat.color}`} />
                                <span className="font-bold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{stat.label}</span>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-slate-800 dark:text-slate-200">{formatCurrency(stat.amount, currency)}</span>
                                <span className="text-xs text-slate-400 font-medium">{stat.percentage.toFixed(1)}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Balanços per Persona */}
        <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-4">Balanç per Persona</h3>
            <div className="space-y-3">
                {balances.map(balance => {
                    const isPositive = balance.amount > 0;
                    const isZero = Math.abs(balance.amount) < 0.01;
                    return (
                        <div key={balance.userId} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                            <span className="font-bold text-slate-700 dark:text-slate-300">{getUserName(balance.userId)}</span>
                            <span className={`font-black font-mono text-lg ${isZero ? 'text-slate-400' : isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isPositive ? '+' : ''}{formatCurrency(balance.amount, currency)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </section>
    </div>
  );
}