import React, { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  
  // UX: Tancar amb la tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    
    // Afegim l'event listener només si el modal està obert
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Opcional: Bloquejar l'scroll del body quan el modal és obert
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    // Backdrop: Ara tanca el modal al fer clic (onClick={onClose})
    <div 
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      aria-hidden="true" // El backdrop és decoratiu/funcional, no contingut
    >
      
      {/* Contenidor del Modal */}
      {/* stopPropagation: Evita que clicks dins la caixa tanquin el modal */}
      <div 
        className="bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        
        {/* Capçalera Sticky */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 transition-colors">
          <h3 id="modal-title" className="text-lg font-bold text-slate-800 dark:text-white">
            {title}
          </h3>
          
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700"
            aria-label="Tancar"
          >
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