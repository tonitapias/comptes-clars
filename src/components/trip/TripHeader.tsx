import React from 'react';
import { Settings, Users, Share2, FileText, History, ArrowLeft, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTrip } from '../../context/TripContext';
import { useTheme } from '../../hooks/useTheme';
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
  const { theme, toggleTheme } = useTheme();
  
  if (!tripData) return null;

  const { name, createdAt, users, currency } = tripData;
  const activeUserCount = users.filter(u => !u.isDeleted).length;

  // Botó d'acció reutilitzable per netejar el codi
  const ActionButton = ({ onClick, icon: Icon, label }: { onClick: () => void, icon: any, label: string }) => (
    <button 
      onClick={onClick} 
      title={label}
      className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-900/30 transition-all active:scale-95"
    >
       <Icon size={20} />
    </button>
  );

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200/60 dark:border-slate-800 shadow-sm transition-colors pb-6 animate-fade-in">
      <div className="max-w-3xl mx-auto px-4 pt-4">
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-6">
          <Link 
            to="/" 
            className="p-2.5 -ml-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all"
            aria-label="Tornar enrere"
          >
            <ArrowLeft size={24} />
          </Link>
          
          <div className="flex gap-2">
            <ActionButton onClick={toggleTheme} icon={theme === 'light' ? Moon : Sun} label="Canviar tema" />
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1 self-center" /> {/* Separador visual */}
            <ActionButton onClick={onOpenActivity} icon={History} label="Historial" />
            <ActionButton onClick={onOpenShare} icon={Share2} label="Compartir" />
            <ActionButton onClick={onOpenSettings} icon={Settings} label="Configuració" />
          </div>
        </div>

        {/* Info Principal */}
        <div className="flex flex-col items-center text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {name}
          </h1>
          
          <div className="flex items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400">
            <span>{new Date(createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
            <button 
                onClick={onOpenGroup} 
                className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors py-1 px-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
            >
              <Users size={16} /> 
              <span>{activeUserCount} membres</span>
            </button>
          </div>

          {/* Big Total amb Gradient Premium */}
          <div className="pt-6 pb-2 flex flex-col items-center animate-scale-in">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
              {isFiltered ? 'Total Filtrat' : 'Despesa Total'}
            </span>
            <div className="text-5xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-500 dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-300 drop-shadow-sm">
              {formatCurrency(isFiltered ? displayedTotal : totalGroupSpending, currency)}
            </div>
            
            {!isFiltered && (
               <button 
                onClick={onExportPDF} 
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 transition-colors"
               >
                 <FileText size={14}/> 
                 Descarregar Informe
               </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}