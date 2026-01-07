import React, { ReactNode, ButtonHTMLAttributes } from 'react';
import { Loader2, LucideIcon } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  loading?: boolean;
  icon?: LucideIcon;
}

const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', loading = false, icon: Icon, className = "", disabled, ...props 
}) => {
  
  const baseStyles = "font-bold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  
  // AFEGIT: classes 'dark:' per a cada variant
  const variants = {
    // Primary: Menys brillantor a l'ombra, color una mica més suau si cal
    primary: "bg-indigo-600 dark:bg-indigo-600 text-white hover:bg-indigo-700 dark:hover:bg-indigo-500 shadow-lg shadow-indigo-200 dark:shadow-none",
    
    // Secondary: Fons fosc, vora fosca, text clar
    secondary: "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800",
    
    // Ghost: Hover fosc
    ghost: "bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
    
    // Danger: Fons vermellós translúcid en lloc de sòlid brillant
    danger: "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30",
    
    // Success: Fons verdós translúcid
    success: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" size={20} /> : Icon && <Icon size={20} />}
      {children}
    </button>
  );
};

export default Button;