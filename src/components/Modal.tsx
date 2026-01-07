import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    // El backdrop (fons fosc transparent) es manté igual, funciona bé en tots dos modes
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      
      {/* Contenidor: dark:bg-slate-900 */}
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col transition-colors duration-300">
        
        {/* Capçalera Sticky: dark:border-slate-800 dark:bg-slate-900 */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 transition-colors">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h3>
          
          {/* Botó Tancar: hover adaptat */}
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {/* Contingut interior */}
        <div className="p-4 overflow-y-auto custom-scrollbar dark:text-slate-300">
            {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;