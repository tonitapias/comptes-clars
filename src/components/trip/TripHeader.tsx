import { Settings, Users, Share2, FileText, History, ArrowLeft, Sun, Moon, TrendingUp, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTrip } from '../../context/TripContext';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/formatters';
import { toCents } from '../../types';

interface TripHeaderProps {
  displayedTotal: number;
  totalGroupSpending: number;
  userBalance: number;
  isFiltered: boolean;
  onOpenSettings: () => void;
  onOpenGroup: () => void;
  onExportPDF: () => void;
  onOpenShare: () => void;
  onOpenActivity: () => void;
}

export default function TripHeader({
  displayedTotal, 
  totalGroupSpending, 
  userBalance,
  isFiltered,
  onOpenSettings, onOpenGroup, onExportPDF, onOpenShare, onOpenActivity
}: TripHeaderProps) {
  
  const { tripData } = useTrip();
  const { theme, toggleTheme } = useTheme();
  
  if (!tripData) return null;

  const { name, currency } = tripData;

  const isOwed = userBalance > 0.50;
  const owes = userBalance < -0.50;
  const isSettled = !isOwed && !owes;

  // Components UI
  const NavButton = ({ onClick, children }: { onClick: () => void, children: React.ReactNode }) => (
    <button 
      onClick={onClick}
      className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-200/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 backdrop-blur-md transition-all active:scale-95"
    >
      {children}
    </button>
  );

  // Botons "Joia" espectaculars
  const ActionButton = ({ 
    icon: Icon, 
    label, 
    onClick, 
    colorClass 
  }: { 
    icon: any, 
    label: string, 
    onClick: () => void, 
    colorClass: string 
  }) => (
    <button 
      onClick={onClick}
      className="flex flex-col items-center gap-2 group min-w-[72px]"
    >
      {/* Contenidor del botó amb efectes de llum */}
      <div className={`
        relative w-14 h-14 rounded-2xl flex items-center justify-center 
        text-white shadow-lg transition-all duration-300 
        group-hover:scale-110 group-active:scale-95
        bg-gradient-to-br ${colorClass}
        border border-white/20 dark:border-white/10
      `}>
        {/* Glow extern (ombra de color) */}
        <div className={`absolute inset-0 rounded-2xl blur-xl opacity-40 group-hover:opacity-70 transition-opacity bg-inherit`} />
        
        {/* Icona */}
        <div className="relative z-10 drop-shadow-md">
            <Icon size={24} strokeWidth={2.5} />
        </div>
        
        {/* Brillantor "Glossy" superior */}
        <div className="absolute inset-x-0 top-0 h-[50%] bg-gradient-to-b from-white/20 to-transparent rounded-t-2xl pointer-events-none" />
      </div>

      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
        {label}
      </span>
    </button>
  );

  return (
    <header className="flex flex-col pt-4 pb-8 gap-8 overflow-visible relative z-30">
      
      {/* --- TOP NAVIGATION --- */}
      <div className="flex items-center justify-between px-5">
        <Link 
            to="/" 
            className="w-10 h-10 flex items-center justify-center -ml-2 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90"
        >
          <ArrowLeft size={24} strokeWidth={2.5} />
        </Link>

        <div className="flex items-center gap-2">
            <NavButton onClick={toggleTheme}>
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </NavButton>
            <NavButton onClick={onOpenSettings}>
                <Settings size={20} />
            </NavButton>
        </div>
      </div>

      {/* --- THE HERO CARD (Dark & Premium) --- */}
      <div className="mx-4 relative group perspective">
        
        <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 dark:bg-black shadow-2xl shadow-slate-400/40 dark:shadow-indigo-900/20 transition-all duration-500 transform group-hover:scale-[1.01]">
            
            {/* Background Animations */}
            <div className="absolute top-[-50%] left-[-20%] w-[100%] h-[150%] bg-indigo-600/30 blur-[80px] rounded-full pointer-events-none opacity-60 mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute bottom-[-30%] right-[-10%] w-[80%] h-[100%] bg-fuchsia-600/20 blur-[60px] rounded-full pointer-events-none opacity-50 mix-blend-screen" />
            <div className="absolute inset-0 opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none mix-blend-overlay" />

            <div className="relative z-10 flex flex-col items-center py-10 px-6 text-white">
                
                {/* Trip Name */}
                <div className="mb-4 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-white/70">
                        {name}
                    </span>
                    {isFiltered && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_10px_rgba(129,140,248,0.8)]" />}
                </div>

                {/* Amount */}
                <div className="flex flex-col items-center">
                    <h1 className="text-6xl sm:text-7xl font-black tracking-tighter text-white drop-shadow-xl leading-none">
                        <span className="text-3xl align-top font-bold tracking-normal opacity-50 mr-1.5">
                            {currency.symbol}
                        </span>
                        {formatCurrency(toCents(isFiltered ? displayedTotal : totalGroupSpending), currency).replace(/[^0-9.,]/g, '')}
                    </h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-2">
                        Despesa Total
                    </p>
                </div>

                {/* User Status (Only if debt/credit) */}
                {!isSettled && (
                    <div className="mt-8 w-full flex justify-center animate-fade-in-up">
                        <div className={`
                            flex items-center gap-3 pl-3 pr-5 py-2 rounded-2xl backdrop-blur-xl border transition-all
                            ${isOwed 
                                ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                                : 'bg-rose-500/20 border-rose-400/30 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.2)]'}
                        `}>
                            <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center shadow-lg
                                ${isOwed ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}
                            `}>
                                {isOwed ? <TrendingUp size={16} strokeWidth={3} /> : <TrendingDown size={16} strokeWidth={3} />}
                            </div>
                            
                            <div className="flex flex-col leading-none">
                                <span className="text-[9px] font-bold uppercase tracking-wider opacity-80 mb-0.5">
                                    {isOwed ? 'Et deuen' : 'Has de pagar'}
                                </span>
                                <span className="text-lg font-black tracking-tight tabular-nums">
                                    {formatCurrency(toCents(Math.abs(userBalance)), currency)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* --- SPECTACULAR ACTION BUTTONS --- */}
      <div className="w-full px-4 relative z-10">
        <div className="flex justify-center gap-5 sm:gap-8 overflow-x-auto hide-scrollbar py-2">
            
            <ActionButton 
                icon={Users} 
                label="Grup" 
                onClick={onOpenGroup} 
                colorClass="from-indigo-500 to-violet-600 shadow-indigo-500/40"
            />
            
            <ActionButton 
                icon={History} 
                label="Activitat" 
                onClick={onOpenActivity} 
                colorClass="from-amber-400 to-orange-500 shadow-orange-500/40"
            />
            
            <ActionButton 
                icon={FileText} 
                label="PDF" 
                onClick={onExportPDF} 
                colorClass="from-blue-400 to-cyan-500 shadow-cyan-500/40"
            />
            
            <ActionButton 
                icon={Share2} 
                label="Invitar" 
                onClick={onOpenShare} 
                colorClass="from-emerald-400 to-teal-500 shadow-emerald-500/40"
            />

        </div>
      </div>

    </header>
  );
}