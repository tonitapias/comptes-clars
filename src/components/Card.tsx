import React, { ReactNode, KeyboardEvent } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ children, className = "", onClick }) => {
  const isInteractive = !!onClick;

  // Gestió de teclat per a accessibilitat (A11y)
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault(); // Evita scroll amb espai
      onClick();
    }
  };

  // Estils condicionals per a interactivitat
  const interactiveStyles = isInteractive 
    ? "cursor-pointer hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900" 
    : "";

  return (
    <div 
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      className={`
        bg-white dark:bg-slate-900 
        rounded-2xl border border-slate-100 dark:border-slate-800 
        shadow-sm transition-all duration-200 
        ${interactiveStyles} 
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;