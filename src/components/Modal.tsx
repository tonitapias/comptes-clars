import React, { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // UX: Tancar amb la tecla ESC i Bloqueig d'Scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      // A11y: Portar el focus al modal quan s'obre
      modalRef.current?.focus();
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // Restaurar scroll de forma segura
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    // Backdrop: z-modal (60) per assegurar que està per sobre de sticky headers (40)
    <div 
      className="fixed inset-0 z-modal flex items-end md:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      aria-hidden="true" 
    >
      
      {/* Contenidor del Modal */}
      <div 
        ref={modalRef}
        // Colors semàntics: bg-surface-elevated
        className="bg-surface-elevated rounded-t-3xl md:rounded-3xl w-full max-w-lg shadow-financial-lg overflow-hidden animate-slide-up max-h-[90vh] flex flex-col transition-colors duration-300 outline-none"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1} // Permet fer focus programàticament
      >
        
        {/* Capçalera Sticky */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-surface-elevated sticky top-0 z-10">
          <h3 id="modal-title" className="text-xl font-bold text-content-body">
            {title}
          </h3>
          
          <button 
            onClick={onClose} 
            className="p-2 -mr-2 hover:bg-surface-ground rounded-full text-content-muted hover:text-content-body transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Tancar"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Contingut interior */}
        <div className="p-5 overflow-y-auto custom-scrollbar text-content-body">
            {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;