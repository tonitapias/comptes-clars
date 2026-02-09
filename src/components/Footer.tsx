import React from 'react';
// Importem el package.json. 
// Si TypeScript es queixa aquí, ho solucionem al Pas 3 (tsconfig.json), però Vite ho compilarà bé igualment.
import pkg from '../../package.json'; 

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full py-6 mt-auto text-center border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <div className="flex flex-col items-center justify-center gap-1">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Comptes Clars by <span className="text-indigo-600 dark:text-indigo-400 font-bold">Toni</span>
        </p>
        <p className="text-[10px] text-slate-400 dark:text-slate-600 font-mono">
          v{pkg.version} • © {currentYear}
        </p>
      </div>
    </footer>
  );
}