import React, { ReactNode, ButtonHTMLAttributes } from 'react';
import { Loader2, LucideIcon } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  loading?: boolean;
  icon?: LucideIcon;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  loading = false, 
  icon: Icon, 
  className = "", 
  disabled, 
  fullWidth = false,
  ...props 
}) => {
  
  // BASE:
  // - ring-offset: crea espai entre el botó i l'anell de focus (millora accessibilitat)
  // - focus-visible: només mostra l'anell en navegació per teclat
  // - active:scale-[0.98]: feedback tàctil subtil
  const baseStyles = `
    relative font-bold rounded-xl transition-all duration-200 
    flex items-center justify-center gap-2 select-none
    disabled:opacity-100 disabled:cursor-not-allowed disabled:shadow-none
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-offset-slate-900
    active:scale-[0.98] disabled:active:scale-100
  `;
  
  const widthStyles = fullWidth ? "w-full" : "";

  const variants = {
    // Primary: Sòlid, amb ombra suau en hover
    primary: `
      bg-indigo-600 text-white shadow-md shadow-indigo-200/50 
      hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200/60 
      dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:shadow-none
      disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-600
    `,
    
    // Secondary: Vora subtil, fons net
    secondary: `
      bg-white text-slate-700 border border-slate-200 shadow-sm
      hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900
      dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-750 dark:hover:border-slate-600
      disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 dark:disabled:bg-slate-800/50
    `,
    
    // Ghost: Ideal per accions terciàries
    ghost: `
      bg-transparent text-slate-600 hover:bg-slate-100 hover:text-indigo-700
      dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400
      disabled:text-slate-300 dark:disabled:text-slate-700 disabled:hover:bg-transparent
    `,
    
    // Danger: Ara amb millor contrast (fons blanc + vora vermella)
    danger: `
      bg-white text-rose-700 border border-rose-200 shadow-sm
      hover:bg-rose-50 hover:border-rose-300 hover:text-rose-800
      dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50 dark:hover:bg-rose-900/40
      disabled:opacity-50
    `,
    
    // Success: Verd positiu
    success: `
      bg-emerald-50 text-emerald-700 border border-emerald-100
      hover:bg-emerald-100 hover:text-emerald-800
      dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50 dark:hover:bg-emerald-900/40
      disabled:opacity-50
    `
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthStyles} ${className}`} 
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={20} aria-label="Carregant" />
      ) : Icon ? (
        <Icon size={20} className="shrink-0" aria-hidden="true" />
      ) : null}
      
      {children && <span>{children}</span>}
    </button>
  );
};

export default Button;