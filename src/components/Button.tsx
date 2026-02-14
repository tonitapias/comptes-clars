import React, { ReactNode, ButtonHTMLAttributes } from 'react';
import { Loader2, LucideIcon } from 'lucide-react';
// Importem el hook
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  loading?: boolean;
  icon?: LucideIcon;
  fullWidth?: boolean;
  haptic?: 'light' | 'medium' | 'heavy' | 'success' | 'none'; // Nova prop
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  loading = false, 
  icon: Icon, 
  className = "", 
  disabled, 
  fullWidth = false,
  haptic, // Recuperem la prop
  onClick,
  ...props 
}) => {
  
  const { trigger } = useHapticFeedback();
  
  // Determinem el feedback per defecte segons la variant
  const defaultHaptic = variant === 'primary' ? 'light' : 'none';
  const hapticPattern = haptic || defaultHaptic;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading && hapticPattern !== 'none') {
        trigger(hapticPattern);
    }
    onClick?.(e);
  };

  // ... (La resta d'estils es mantenen igual que a la Fase 1) ...
  const baseStyles = `
    relative font-bold rounded-xl transition-all duration-200 
    flex items-center justify-center gap-2 select-none
    disabled:opacity-100 disabled:cursor-not-allowed disabled:shadow-none
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary dark:focus-visible:ring-offset-slate-900
    active:scale-[0.96] disabled:active:scale-100
  `;
  
  const widthStyles = fullWidth ? "w-full" : "";

  const variants = {
    primary: `
      bg-primary text-white shadow-financial-md 
      hover:bg-primary-hover hover:shadow-financial-lg
      dark:bg-primary-dark dark:hover:bg-primary
      disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-600
    `,
    secondary: `
      bg-surface-card text-content-body border border-slate-200 shadow-sm
      hover:bg-surface-ground hover:border-slate-300
      dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-750
      disabled:bg-slate-50 disabled:text-slate-400
    `,
    ghost: `
      bg-transparent text-content-muted hover:bg-slate-100 hover:text-primary
      dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400
    `,
    danger: `
      bg-surface-card text-status-error border border-rose-200 shadow-sm
      hover:bg-rose-50 hover:border-rose-300
      dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50
    `,
    success: `
      bg-emerald-50 text-emerald-700 border border-emerald-100
      hover:bg-emerald-100
      dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50
    `
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthStyles} ${className}`} 
      disabled={disabled || loading}
      onClick={handleClick} // Utilitzem el nostre handler
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