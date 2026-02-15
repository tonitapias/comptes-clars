import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Tanquem amb ESC i bloquegem scroll del body
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      // Enfocament automàtic al muntar (opcional per millorar A11y)
      modalRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Tanquem si fem click fora (al backdrop)
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    /* FIX A11Y: Eliminat aria-hidden="true" d'aquest contenidor.
       El backdrop visual es manté, però ja no amaguem el contingut 
       als lectors de pantalla mentre té el focus.
    */
    <div 
      className="fixed inset-0 z-modal flex items-end md:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-surface-elevated rounded-t-3xl md:rounded-3xl w-full max-w-lg shadow-financial-lg overflow-hidden animate-slide-up max-h-[90vh] flex flex-col transition-colors duration-300 outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        tabIndex={-1}
        ref={modalRef}
      >
        {title && (
           <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-surface-elevated sticky top-0 z-10">
              <h2 id="modal-title" className="text-lg font-black text-content-body">{title}</h2>
              <button 
                onClick={onClose} 
                className="p-2 -mr-2 text-content-subtle hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                aria-label="Tancar"
              >
                <X size={20} />
              </button>
           </div>
        )}
        
        <div className="p-5 overflow-y-auto custom-scrollbar text-content-body">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}