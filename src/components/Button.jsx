import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({ children, onClick, variant = "primary", className = "", icon: Icon, disabled = false, loading = false, type = "button" }) => {
  const baseStyle = "px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200"
  };
  
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : (Icon && <Icon size={18} />)}
      {children}
    </button>
  );
};

export default Button;