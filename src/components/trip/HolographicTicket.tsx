import { ArrowRight } from 'lucide-react';
import Avatar from '../Avatar';
import { TripUser, Currency, MoneyCents } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { LITERALS } from '../../constants/literals';

interface HolographicTicketProps {
  amount: MoneyCents;
  currency: Currency;
  fromUser: TripUser;
  toUser: TripUser;
}

export default function HolographicTicket({ amount, currency, fromUser, toUser }: HolographicTicketProps) {
  return (
    <div className="relative mx-1 group perspective">
      {/* Decoració de fons (punts i brillantor) */}
      <div className="absolute top-[60%] -left-3 w-6 h-6 bg-slate-50 dark:bg-[#000000] rounded-full z-20" />
      <div className="absolute top-[60%] -right-3 w-6 h-6 bg-slate-50 dark:bg-[#000000] rounded-full z-20" />
      <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-[2rem] opacity-50 group-hover:opacity-70 transition-opacity" />

      {/* Contenidor Principal de la Targeta */}
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-0 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden transform transition-transform duration-500 hover:scale-[1.01]">
        
        {/* Capçalera amb Gradient i Import */}
        <div className="h-28 bg-gradient-to-br from-indigo-600 to-purple-600 relative overflow-hidden flex flex-col items-center justify-center text-white">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" />
          <span className="relative z-10 text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">
            {LITERALS.MODALS.SETTLE.TOTAL_LABEL}
          </span>
          <h2 className="relative z-10 text-4xl font-black tracking-tighter drop-shadow-md">
            {formatCurrency(amount, currency)}
          </h2>
        </div>

        {/* Cos del Tiquet amb els Usuaris */}
        <div className="p-6 pt-6 relative">
          <div className="flex items-center justify-between relative z-10 mb-6">
            {/* Pagador */}
            <div className="flex flex-col items-center gap-2 w-20">
              <Avatar name={fromUser.name} photoUrl={fromUser.photoUrl} size="md" className="grayscale" />
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate w-full text-center">
                {fromUser.name}
              </span>
            </div>

            {/* Fletxa Animada Central */}
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 px-2">
              <div className="flex gap-1 mb-1">
                <span className="w-1 h-1 rounded-full bg-indigo-500 animate-ping" />
                <span className="w-1 h-1 rounded-full bg-indigo-400" />
                <span className="w-1 h-1 rounded-full bg-indigo-300" />
              </div>
              <ArrowRight size={20} className="text-indigo-500" />
            </div>

            {/* Receptor */}
            <div className="flex flex-col items-center gap-2 w-20">
              <Avatar name={toUser.name} photoUrl={toUser.photoUrl} size="md" />
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 truncate w-full text-center">
                {toUser.name}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}