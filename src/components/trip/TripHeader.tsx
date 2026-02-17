import React from 'react';
import { Settings, Users, Share2, FileText, History, ArrowLeft, Sun, Moon, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTrip } from '../../context/TripContext';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/formatters';
import { toCents } from '../../types'; // <--- NOU IMPORT NECESSARI
import Button from '../Button';

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

  // Classes base per als botons de navegació circulars
  const navBtnClasses = "w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-all hover:scale-105 active:scale-95 hover:text-primary dark:hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <header className="relative z-30 flex flex-col pt-4 pb-6 px-4 animate-fade-in bg-slate-50 dark:bg-slate-900/50 transition-colors duration-300">
      
      {/* --- NAVBAR SUPERIOR --- */}
      <div className="flex items-center justify-between mb-8">
        <Link 
          to="/" 
          className={navBtnClasses}
          aria-label="Tornar a l'inici"
        >
          <ArrowLeft size={20} strokeWidth={2.5} />
        </Link>

        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className={navBtnClasses}
            aria-label={`Canviar a mode ${theme === 'dark' ? 'clar' : 'fosc'}`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <button 
            onClick={onOpenSettings}
            className={navBtnClasses}
            aria-label="Configuració del viatge"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* --- HERO SECTION (Import & Títol) --- */}
      <div className="flex flex-col items-center text-center w-full mb-8 relative">
        
        {/* Títol del Viatge (Context) */}
        <h1 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
          {name}
        </h1>

        {/* Import Principal */}
        <div className="relative group cursor-default mb-4">
          <div className="text-6xl sm:text-7xl font-black tracking-tighter tabular-nums text-slate-800 dark:text-white drop-shadow-sm transition-transform duration-300">
            {/* FIX: Utilitzem toCents() per convertir el número al tipus MoneyCents que exigeix formatCurrency */}
            {formatCurrency(toCents(isFiltered ? displayedTotal : totalGroupSpending), currency)}
          </div>
          
          {/* Badge de Filtres Actius (Molt més visible) */}
          {isFiltered && (
             <div className="absolute -top-6 right-0 left-0 mx-auto w-fit bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                <Filter size={12} className="stroke-[3]" />
                <span className="text-[10px] font-black uppercase tracking-wide">Filtres Actius</span>
             </div>
          )}
        </div>

        {/* Botó d'Acció Secundària (PDF) */}
        {!isFiltered && (
            <button 
              onClick={onExportPDF} 
              className="
                flex items-center gap-2 text-xs font-bold text-primary 
                bg-white dark:bg-slate-800 border border-primary/20 dark:border-primary/10
                px-4 py-2 rounded-full shadow-sm transition-all active:scale-95 hover:bg-primary/5
              "
            >
              <FileText size={14} />
              <span>Exportar PDF</span>
            </button>
        )}
      </div>

      {/* --- ACTION GRID (Botons Grans) --- */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-md mx-auto">
        <button 
          onClick={onOpenGroup}
          className="flex flex-col items-center justify-center gap-1 h-20 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-primary/30 transition-all active:scale-95 group"
        >
            <div className="text-slate-400 group-hover:text-primary transition-colors">
                <Users size={24} />
            </div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {activeUserCount} membres
            </span>
        </button>

        <button 
          onClick={onOpenActivity}
          className="flex flex-col items-center justify-center gap-1 h-20 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-primary/30 transition-all active:scale-95 group"
        >
            <div className="text-slate-400 group-hover:text-primary transition-colors">
                <History size={24} />
            </div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Activitat
            </span>
        </button>

        <button 
          onClick={onOpenShare}
          className="flex flex-col items-center justify-center gap-1 h-20 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-primary/30 transition-all active:scale-95 group"
        >
            <div className="text-slate-400 group-hover:text-primary transition-colors">
                <Share2 size={24} />
            </div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Compartir
            </span>
        </button>
      </div>
    </header>
  );
}