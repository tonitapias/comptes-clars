import React from 'react';
import { Settings, Users, Share2, FileText, History, ArrowLeft, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTrip } from '../../context/TripContext';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/formatters';
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

  return (
    <header className="relative z-30 flex flex-col items-center pt-6 pb-2 px-4 animate-fade-in">
      
      {/* --- TOP BAR --- */}
      <div className="w-full flex items-center justify-between mb-6 max-w-3xl">
        <Link 
          to="/" 
          className="p-3 -ml-3 rounded-full text-content-subtle hover:bg-surface-ground hover:text-content-body transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Tornar a l'inici"
        >
          <ArrowLeft size={24} />
        </Link>

        <div className="flex items-center gap-1">
          <button 
            onClick={toggleTheme}
            className="p-3 rounded-full text-content-subtle hover:bg-surface-ground hover:text-status-warning transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`Canviar a mode ${theme === 'dark' ? 'clar' : 'fosc'}`}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <button 
            onClick={onOpenSettings}
            className="p-3 -mr-3 rounded-full text-content-subtle hover:bg-surface-ground hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Configuració del viatge"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* --- HERO SECTION --- */}
      <div className="flex flex-col items-center text-center w-full mb-8">
        <h1 className="text-lg font-bold text-content-muted mb-1 flex items-center gap-2">
          {name}
        </h1>

        {/* MILLORA 1: Contrast Augmentat (text-content-subtle -> text-content-muted) */}
        <span className="text-xxs font-bold text-content-muted uppercase tracking-widest mb-2">
          {isFiltered ? 'Total Filtrat' : 'Despesa Total'}
        </span>

        {/* Big Number */}
        <div className="relative group cursor-default">
          <div className="text-5xl sm:text-6xl font-black tracking-tighter tabular-nums text-transparent bg-clip-text bg-gradient-to-br from-primary via-violet-600 to-primary-dark drop-shadow-sm transition-transform duration-300 hover:scale-105">
            {formatCurrency(isFiltered ? displayedTotal : totalGroupSpending, currency)}
          </div>
          
          {isFiltered && (
             <div className="absolute -right-4 -top-2 w-3 h-3 bg-primary rounded-full animate-pulse" title="Filtres actius" />
          )}
        </div>

        {!isFiltered && (
            // MILLORA 2: Botó més robust i accessible
            <button 
              onClick={onExportPDF} 
              className="
                mt-4 flex items-center gap-2 text-xs font-bold text-primary 
                bg-primary-light/50 hover:bg-primary-light border border-primary/10
                px-4 py-2 rounded-full transition-all active:scale-95
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
              "
              aria-label="Exportar informe en PDF"
            >
              <FileText size={14} /> {/* Icona lleugerament més gran (12 -> 14) */}
              Exportar PDF
            </button>
        )}
      </div>

      {/* --- QUICK ACTIONS ROW --- */}
      <div className="flex flex-wrap justify-center gap-3 w-full max-w-lg mb-2">
        <Button 
          variant="secondary" 
          onClick={onOpenGroup} 
          className="flex-1 min-w-[100px] h-10 text-xs shadow-sm bg-surface-card/50 backdrop-blur-sm text-content-muted hover:text-content-body border border-transparent hover:border-slate-200 dark:hover:border-slate-700" 
          icon={Users}
        >
          {activeUserCount} <span className="hidden sm:inline">membres</span>
        </Button>

        <Button 
          variant="secondary" 
          onClick={onOpenActivity} 
          className="flex-1 min-w-[100px] h-10 text-xs shadow-sm bg-surface-card/50 backdrop-blur-sm text-content-muted hover:text-content-body border border-transparent hover:border-slate-200 dark:hover:border-slate-700" 
          icon={History}
        >
          Activitat
        </Button>

        <Button 
          variant="secondary" 
          onClick={onOpenShare} 
          className="w-10 h-10 p-0 flex items-center justify-center rounded-xl shadow-sm bg-surface-card/50 backdrop-blur-sm text-content-muted hover:text-primary border border-transparent hover:border-primary/20"
          aria-label="Compartir viatge"
        >
          <Share2 size={18} />
        </Button>
      </div>
    </header>
  );
}