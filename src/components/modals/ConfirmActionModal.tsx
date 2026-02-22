// src/components/modals/ConfirmActionModal.tsx
import { AlertTriangle, Trash2 } from 'lucide-react';
import Modal from '../Modal';
import Button from '../Button';
import { LITERALS } from '../../constants/literals';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  trigger: ReturnType<typeof useHapticFeedback>['trigger'];
}

export default function ConfirmActionModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  trigger 
}: ConfirmActionModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="flex flex-col items-center text-center pt-4 pb-2 animate-fade-in">
        <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-full mb-5 text-rose-500 dark:text-rose-400 shadow-sm border border-rose-100 dark:border-rose-900/50 relative">
            <AlertTriangle size={36} strokeWidth={1.5} />
            <div className="absolute inset-0 rounded-full border-4 border-rose-100 dark:border-rose-900/10 animate-pulse-slow" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            {title || LITERALS.MODALS.CONFIRM.DEFAULT_TITLE}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 mb-8 px-4 text-sm leading-relaxed">
            {message}
        </p>
        <div className="grid grid-cols-2 gap-3 w-full">
            <Button 
                variant="secondary" 
                onClick={() => { trigger('light'); onClose(); }} 
                className="h-12 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold"
            >
                {LITERALS.MODALS.CONFIRM.BTN_CANCEL}
            </Button>
            <Button 
                variant="danger" 
                onClick={onConfirm} 
                className="h-12 rounded-xl shadow-lg shadow-rose-500/20 active:shadow-none transition-all font-bold" 
                icon={Trash2}
            >
                {LITERALS.MODALS.CONFIRM.BTN_DELETE}
            </Button>
        </div>
      </div>
    </Modal>
  );
}