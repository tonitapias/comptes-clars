import React, { ReactNode, ButtonHTMLAttributes } from 'react';
import { Loader2, LucideIcon } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  loading?: boolean;
  icon?: LucideIcon;
  fullWidth?: boolean; // AFEGIT: Per controlar l'amplada explícitament
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
  // - ring-offset: crea espai entre el botó i l'anell de focus
  // - focus-visible: només mostra l'anell en navegació per teclat
  // - active:scale-[0.98]: feedback tàctil subtil
  const baseStyles = `
    relative font-bold rounded-xl transition-all duration-200 
    flex items-center justify-center gap-2 
    disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-offset-slate-900
    active:scale-[0.98]
  `;
  
  const widthStyles = fullWidth ? "w-full" : "";

  const variants = {
    // Primary: Sòlid, sense ombres difuses de color que redueixen llegibilitat
    primary: "bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-400 shadow-md hover:shadow-lg border border-transparent",
    
    // Secondary: Vora subtil, fons net
    secondary: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
    
    // Ghost: Ideal per accions terciàries
    ghost: "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400",
    
    // Danger: Vermell clar per evitar alarmisme innecessari, però clar
    danger: "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/40",
    
    // Success: Verd positiu
    success: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthStyles} ${className}`} 
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={20} />
      ) : Icon ? (
        <Icon size={20} className="shrink-0" /> // shrink-0 evita que la icona s'aixafi
      ) : null}
      
      {children && <span>{children}</span>}
    </button>
  );
};

export default Button;