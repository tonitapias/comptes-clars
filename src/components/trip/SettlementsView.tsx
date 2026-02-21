import { ArrowRight, CheckCircle2, ShieldCheck, Wallet, ArrowRightLeft } from 'lucide-react';
import Avatar from '../Avatar';
import Button from '../Button';
import { Settlement, TripUser } from '../../types';
import { useTripState } from '../../context/TripContext'; // <-- CANVI
import { formatCurrency } from '../../utils/formatters';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

interface SettlementsViewProps {
  settlements: Settlement[];
  onSettle: (settlement: Settlement) => void;
}

export default function SettlementsView({ settlements, onSettle }: SettlementsViewProps) {
  const { tripData } = useTripState(); // <-- CANVI
  const { trigger } = useHapticFeedback();

  if (!tripData) return null;
  const { users, currency } = tripData;

  const getUser = (id: string) => users.find(u => u.id === id) || { name: 'Desconegut', id: 'unknown' } as TripUser;

  if (settlements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-in text-center px-6">
        <div className="relative mb-8 group">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-700" />
            <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-50 to-white dark:from-slate-900 dark:to-black rounded-3xl flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50 shadow-xl shadow-emerald-500/10">
                <ShieldCheck size={40} className="text-emerald-500 dark:text-emerald-400" strokeWidth={1.5} />
            </div>
        </div>
        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">Tot Quadrat</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed font-medium">El grup està en pau. <br/>No hi ha deutes pendents.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32 animate-fade-in pt-4 px-1">
      <div className="relative overflow-hidden rounded-2xl bg-indigo-600/5 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 p-5">
         <div className="flex items-start gap-4 relative z-10">
            <div className="p-3 bg-white dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400 shadow-sm"><Wallet size={20} strokeWidth={2.5} /></div>
            <div>
                <h4 className="font-bold text-indigo-900 dark:text-indigo-100 text-sm mb-1">Pla de Liquidació Intel·ligent</h4>
                <p className="text-xs text-indigo-700/80 dark:text-indigo-300/70 leading-relaxed font-medium">Hem optimitzat les rutes de pagament per reduir el nombre de transaccions necessàries.</p>
            </div>
        </div>
      </div>

      <div className="grid gap-6">
        {settlements.map((settlement, index) => {
          const fromUser = getUser(settlement.from);
          const toUser = getUser(settlement.to);
          
          return (
            <div key={`${settlement.from}-${settlement.to}-${index}`} className="group relative rounded-[2rem] transition-all duration-500 hover:-translate-y-1" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500/20 via-transparent to-emerald-500/20 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative bg-white dark:bg-[#0A0A0A] border border-slate-100 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none">
                    <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none mix-blend-overlay" />
                    <div className="p-6 pb-2">
                        <div className="flex items-center justify-between relative">
                            <div className="absolute top-1/2 left-10 right-10 h-[2px] bg-slate-100 dark:bg-slate-800 z-0">
                                <div className="absolute inset-0 bg-gradient-to-r from-rose-500 via-transparent to-emerald-500 opacity-30 blur-[1px]" />
                                <div className="absolute top-1/2 -translate-y-1/2 w-20 h-1 bg-gradient-to-r from-transparent via-white to-transparent dark:via-slate-500 opacity-50 animate-shimmer" />
                            </div>
                            <div className="relative z-10 flex flex-col items-center gap-3 group/avatar">
                                <div className="relative p-1 rounded-full border-2 border-dashed border-rose-200 dark:border-rose-900/50 group-hover/avatar:border-rose-500 group-hover/avatar:scale-105 transition-all duration-300">
                                    <Avatar name={fromUser.name} photoUrl={fromUser.photoUrl} size="lg" className="grayscale group-hover/avatar:grayscale-0 transition-all" />
                                    <div className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-1.5 shadow-lg border-2 border-white dark:border-black"><ArrowRightLeft size={10} strokeWidth={3} /></div>
                                </div>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-wider group-hover/avatar:text-rose-500 transition-colors">{fromUser.name}</span>
                            </div>
                            <div className="relative z-10 bg-slate-50 dark:bg-slate-900 p-2 rounded-full border border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600"><ArrowRight size={16} strokeWidth={3} /></div>
                            <div className="relative z-10 flex flex-col items-center gap-3 group/avatar">
                                <div className="relative p-1 rounded-full border-2 border-dashed border-emerald-200 dark:border-emerald-900/50 group-hover/avatar:border-emerald-500 group-hover/avatar:scale-105 transition-all duration-300">
                                    <Avatar name={toUser.name} photoUrl={toUser.photoUrl} size="lg" className="grayscale group-hover/avatar:grayscale-0 transition-all" />
                                    <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-1.5 shadow-lg border-2 border-white dark:border-black"><CheckCircle2 size={10} strokeWidth={3} /></div>
                                </div>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-wider group-hover/avatar:text-emerald-500 transition-colors">{toUser.name}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-2 flex flex-col items-center gap-4">
                         <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">Transferència</span>
                            <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums drop-shadow-sm">{formatCurrency(settlement.amount, currency)}</span>
                         </div>
                         <Button variant="primary" fullWidth onClick={() => { trigger('success'); onSettle(settlement); }} className="h-14 rounded-2xl text-sm font-black tracking-wide uppercase bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg shadow-slate-900/20 dark:shadow-white/10 hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center gap-2 relative overflow-hidden">
                            <span className="relative z-10 flex items-center gap-2"><CheckCircle2 size={18} strokeWidth={2.5} /> Marcar com a Liquidat</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-black/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                        </Button>
                    </div>
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}