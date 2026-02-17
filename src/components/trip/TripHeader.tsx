import React from 'react';
import { Settings, Users, Share2, FileText, History, ArrowLeft, Sun, Moon, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTrip } from '../../context/TripContext';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/formatters';
import { toCents } from '../../types';

interface TripHeaderProps {
  displayedTotal: number;
  totalGroupSpending: number;
  isFiltered: boolean;
  onOpenSettings: () => void;
  onOpenGroup: () => void;
  onExportPDF: () => void;
  onOpenShare: () => void;
  onOpenActivity: () => void;
}

export default function TripHeader({
  displayedTotal, totalGroupSpending, isFiltered,
  onOpenSettings, onOpenGroup, onExportPDF, onOpenShare, onOpenActivity
}: TripHeaderProps) {
  
  const { tripData } = useTrip();
  const { theme, toggleTheme } = useTheme();
  
  if (!tripData) return null;

  const { name, users, currency } = tripData;
  const activeUserCount = users.filter(u => !u.isDeleted).length;

  // Base classes per botons 'Glass'
  const navBtnClasses = "w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-all active:scale-95 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-primary dark:hover:text-white shadow-sm";

  return (
    <header className="relative z-30 flex flex-col pt-6 pb-2 px-4 animate-fade-in bg-slate-50/50 dark:bg-slate-950/50">
      
      {/* --- 1. TOP NAVIGATION --- */}
      <div className="flex items-center justify-between mb-6">
        <Link 
          to="/" 
          className={navBtnClasses}
          aria-label="Tornar a l'inici"
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
        </Link>

        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className={navBtnClasses}
            aria-label={`Mode ${theme === 'dark' ? 'clar' : 'fosc'}`}
          >
            {theme === 'dark' ? <Sun size={22} strokeWidth={2} /> : <Moon size={22} strokeWidth={2} />}
          </button>
          
          <button 
            onClick={onOpenSettings}
            className={navBtnClasses}
            aria-label="Configuració"
          >
            <Settings size={22} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* --- 2. HERO SECTION (Títol & Import) --- */}
      <div className="flex flex-col items-center text-center w-full mb-8 relative">
        
        {/* Títol del Viatge */}
        <div className="mb-2 px-4 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h1 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 max-w-[200px] truncate">
              {name}
            </h1>
        </div>

        {/* Import Principal */}
        <div className="relative group cursor-default mb-5 mt-1">
          <div className="text-6xl sm:text-7xl font-black tracking-tighter tabular-nums text-slate-900 dark:text-white drop-shadow-sm scale-100 transition-transform">
            {formatCurrency(toCents(isFiltered ? displayedTotal : totalGroupSpending), currency)}
          </div>
          
          {/* Badge de Filtres Actius (Alerta visual) */}
          {isFiltered && (
             <div className="absolute -top-8 right-0 left-0 mx-auto w-fit bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse shadow-sm">
                <Filter size={10} className="stroke-[3]" />
                <span className="text-[10px] font-black uppercase tracking-wide">Filtre Actiu</span>
             </div>
          )}
        </div>

        {/* Botó PDF (Secundari) */}
        {!isFiltered && (
            <button 
              onClick={onExportPDF} 
              className="
                flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400
                bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800
                px-4 py-2 rounded-xl shadow-sm transition-all active:scale-95 hover:border-indigo-200 hover:text-indigo-600 dark:hover:text-indigo-400
              "
            >
              <FileText size={14} strokeWidth={2.5} />
              <span>Informe PDF</span>
            </button>
        )}
      </div>

      {/* --- 3. QUICK ACTIONS GRID --- */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm mx-auto">
        <button 
          onClick={onOpenGroup}
          className="flex flex-col items-center justify-center gap-2 h-24 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all active:scale-95 group"
        >
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <Users size={24} strokeWidth={2} />
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                {activeUserCount} Membres
            </span>
        </button>

        <button 
          onClick={onOpenActivity}
          className="flex flex-col items-center justify-center gap-2 h-24 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-amber-100 dark:hover:border-amber-900/50 transition-all active:scale-95 group"
        >
            <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 group-hover:scale-110 transition-transform">
                <History size={24} strokeWidth={2} />
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                Historial
            </span>
        </button>

        <button 
          onClick={onOpenShare}
          className="flex flex-col items-center justify-center gap-2 h-24 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-100 dark:hover:border-emerald-900/50 transition-all active:scale-95 group"
        >
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Share2 size={24} strokeWidth={2} />
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                Compartir
            </span>
        </button>
      </div>
    </header>
  );
}