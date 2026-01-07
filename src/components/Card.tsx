import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ children, className = "", onClick }) => {
  return (
    // AFEGIT: dark:bg-slate-900 dark:border-slate-800
    <div onClick={onClick} className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
};

export default Card;