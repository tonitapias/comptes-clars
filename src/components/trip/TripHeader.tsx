import React from 'react';
import { Settings, Users, Share2, FileText, History, ArrowLeft, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTrip } from '../../context/TripContext';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/formatters';
import Button from '../Button'; // Integrem el nostre component Button robust

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
      
      {/* --- TOP BAR (Navegació i Eines) --- */}
      <div className="w-full flex items-center justify-between mb-6 max-w-3xl">
        <Link 
          to="/" 
          className="p-3 -ml-3 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Tornar a l'inici"
        >
          <ArrowLeft size={24} />
        </Link>

        <div className="flex items-center gap-1">
          <button 
            onClick={toggleTheme}
            className="p-3 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-500 dark:hover:text-amber-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Canviar tema"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <button 
            onClick={onOpenSettings}
            className="p-3 -mr-3 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Configuració del viatge"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* --- HERO SECTION (Total) --- */}
      <div className="flex flex-col items-center text-center w-full mb-8">
        {/* Títol del Viatge */}
        <h1 className="text-lg font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-2">
          {name}
        </h1>

        {/* Label Contextual */}
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          {isFiltered ? 'Total Filtrat' : 'Despesa Total'}
        </span>

        {/* Big Number */}
        <div className="relative group cursor-default">
          <div className="text-5xl sm:text-6xl font-black tracking-tighter tabular-nums text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-500 dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-300 drop-shadow-sm transition-transform duration-300 hover:scale-105">
            {formatCurrency(isFiltered ? displayedTotal : totalGroupSpending, currency)}
          </div>
          
          {/* Indicador visual si està filtrat */}
          {isFiltered && (
             <div className="absolute -right-4 -top-2 w-3 h-3 bg-indigo-500 rounded-full animate-pulse" title="Filtres actius" />
          )}
        </div>

        {/* Export Action (Contextual) */}
        {!isFiltered && (
            <button 
              onClick={onExportPDF} 
              className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              <FileText size={12} />
              Exportar PDF
            </button>
        )}
      </div>

      {/* --- QUICK ACTIONS ROW --- */}
      {/* Botons compactes per a accions secundàries */}
      <div className="flex flex-wrap justify-center gap-3 w-full max-w-lg mb-2">
        
        <Button 
          variant="secondary" 
          onClick={onOpenGroup} 
          className="flex-1 min-w-[100px] h-10 text-xs shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm" 
          icon={Users}
        >
          {activeUserCount} <span className="hidden sm:inline">membres</span>
        </Button>

        <Button 
          variant="secondary" 
          onClick={onOpenActivity} 
          className="flex-1 min-w-[100px] h-10 text-xs shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm" 
          icon={History}
        >
          Activitat
        </Button>

        <Button 
          variant="secondary" 
          onClick={onOpenShare} 
          className="w-10 h-10 p-0 flex items-center justify-center rounded-xl shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm text-slate-600 dark:text-slate-300"
          aria-label="Compartir viatge"
        >
          <Share2 size={18} />
        </Button>

      </div>
    </header>
  );
}