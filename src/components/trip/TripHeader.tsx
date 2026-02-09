import React from 'react';
import { Settings, Users, Share2, FileText, History, ArrowLeft, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTrip } from '../../context/TripContext';
import { useTheme } from '../../hooks/useTheme'; // <--- Importat
import { formatCurrency } from '../../utils/formatters';

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
  const { theme, toggleTheme } = useTheme(); // <--- Lògica del tema
  
  if (!tripData) return null;

  const { name, createdAt, users, currency } = tripData;
  const activeUserCount = users.filter(u => !u.isDeleted).length;

  return (
    <header className="bg-white dark:bg-slate-900 sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300 pb-4">
      <div className="max-w-3xl mx-auto px-4 pt-4">
        {/* Top Bar */}
        <div className="flex justify-between items-start mb-4">
          <Link to="/" className="p-2 -ml-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div className="flex gap-2">
            {/* Botó Mode Fosc */}
            <button 
              onClick={toggleTheme} 
              className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-slate-50 dark:bg-slate-800 rounded-full"
              title={theme === 'light' ? 'Canviar a mode fosc' : 'Canviar a mode clar'}
            >
               {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            <button onClick={onOpenActivity} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-slate-50 dark:bg-slate-800 rounded-full">
               <History size={20} />
            </button>
            <button onClick={onOpenShare} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-slate-50 dark:bg-slate-800 rounded-full">
               <Share2 size={20} />
            </button>
            <button onClick={onOpenSettings} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-slate-50 dark:bg-slate-800 rounded-full">
               <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Title & Info */}
        <div className="flex flex-col items-center text-center">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-1 leading-tight">{name}</h1>
          <div className="flex items-center gap-3 text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">
            <span>{new Date(createdAt).toLocaleDateString()}</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <button onClick={onOpenGroup} className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              <Users size={14} /> {activeUserCount} membres
            </button>
          </div>

          {/* Big Total */}
          <div className="flex flex-col items-center animate-scale-in">
            <span className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              {isFiltered ? 'Total Filtrat' : 'Despesa Total'}
            </span>
            <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
              {formatCurrency(isFiltered ? displayedTotal : totalGroupSpending, currency)}
            </div>
            
            {!isFiltered && (
               <button onClick={onExportPDF} className="mt-4 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline opacity-80 hover:opacity-100">
                 <FileText size={12}/> Descarregar Informe PDF
               </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}