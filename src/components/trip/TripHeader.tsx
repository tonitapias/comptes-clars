import React from 'react';
import { ArrowLeft, Share2, Settings, FileText, Filter, Users, Moon, Sun } from 'lucide-react';
import { Currency } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useTheme } from '../../hooks/useTheme';

interface TripHeaderProps {
  tripId: string;
  name: string;
  createdAt: string;
  userCount: number;
  displayedTotal: number;
  totalGroupSpending: number;
  currency: Currency;
  isFiltered: boolean;
  onOpenSettings: () => void;
  onOpenGroup: () => void;
  onExportPDF: () => void;
  onOpenShare: () => void;
}

export default function TripHeader({ 
  name, 
  createdAt, 
  userCount, 
  displayedTotal, 
  totalGroupSpending,
  currency, 
  isFiltered, 
  onOpenSettings,
  onOpenGroup,
  onExportPDF,
  onOpenShare
}: TripHeaderProps) {
  
  const { theme, toggleTheme } = useTheme();

  // Càlcul de la mitjana per persona (evitant divisió per zero)
  const averagePerPerson = userCount > 0 ? totalGroupSpending / userCount : 0;

  return (
    <header className="bg-white dark:bg-slate-900 pt-6 pb-6 px-4 sticky top-0 z-30 shadow-sm border-b border-slate-100 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-3xl mx-auto">
        
        {/* FILA SUPERIOR: Botons de navegació i accions */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-1">
             <button 
                onClick={() => window.history.back()} 
                className="p-2 -ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full"
                title="Enrere"
             >
               <ArrowLeft size={24} />
             </button>

             <button 
                onClick={toggleTheme} 
                className="p-2 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors rounded-full"
                title={theme === 'dark' ? "Mode clar" : "Mode fosc"}
             >
               {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
             </button>
          </div>
          
          <div className="flex gap-2">
            <button 
                onClick={onOpenGroup} 
                className="p-2 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-slate-700 transition-colors" 
                title="Gestionar Membres"
            >
              <Users size={20} />
            </button>

            <button onClick={onExportPDF} className="p-2 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-slate-700 transition-colors" title="Exportar PDF">
              <FileText size={20} />
            </button>
            <button onClick={onOpenShare} className="p-2 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-slate-700 transition-colors" title="Compartir">
               <Share2 size={20} />
            </button>
            <button onClick={onOpenSettings} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Configuració">
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* TÍTOL I METADADES */}
        <div>
           <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-1 leading-tight">{name}</h1>
           
           <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              <span>{new Date(createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <button onClick={onOpenGroup} className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  <Users size={12} />
                  {userCount} participants
              </button>
           </div>
        </div>
        
        {/* TARGETA TOTAL (Modificada amb dues columnes) */}
        <div className="mt-6 bg-slate-900 dark:bg-black text-white p-5 rounded-2xl shadow-lg shadow-slate-200 dark:shadow-none relative overflow-hidden transition-colors duration-300 border border-transparent dark:border-slate-800">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/20 rounded-full -ml-10 -mb-10 blur-xl"></div>

            <div className="relative z-10">
                <div className="flex items-end justify-between">
                    
                    {/* COLUMNA ESQUERRA: TOTAL GRUP */}
                    <div>
                        <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase mb-1">Despesa Total</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black tracking-tight">{formatCurrency(displayedTotal, currency)}</span>
                        </div>
                    </div>

                    {/* COLUMNA DRETA: PER PERSONA (NOVA) */}
                    <div className="text-right pb-1">
                        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase mb-0.5">Per persona</p>
                        <span className="text-xl font-bold text-indigo-300 dark:text-indigo-400">
                            {formatCurrency(averagePerPerson, currency)}
                        </span>
                    </div>

                </div>
                
                {isFiltered && (
                    <div className="mt-3 inline-flex items-center gap-2 bg-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border border-white/10">
                        <Filter size={12} className="text-indigo-200"/>
                        <span>Filtrant resultats</span>
                        {displayedTotal !== totalGroupSpending && (
                            <span className="text-indigo-200 border-l border-indigo-500 pl-2 ml-1">
                                Total real: {formatCurrency(totalGroupSpending, currency)}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
    </header>
  );
}