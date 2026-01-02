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
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200",
    secondary: "bg-white text-indigo-600 border border-slate-200 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100",
    danger: "bg-rose-50 text-rose-600 hover:bg-rose-100",
    success: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
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