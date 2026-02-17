import { useEffect, useState, ReactNode } from 'react'; // CORRECCIÓ 1: Eliminem 'React', importem 'ReactNode' per al tipat
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  // AFEGIT: Variants 'dark:' per a cada tipus
  // CORRECCIÓ 2: Tipat explícit Record per garantir cobertura de tots els tipus
  const styles: Record<ToastType, string> = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800',
    error: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800',
    info: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800'
  };

  const icons: Record<ToastType, ReactNode> = {
    success: <CheckCircle2 size={20} className="text-emerald-500" />,
    error: <AlertCircle size={20} className="text-rose-500" />,
    info: <Info size={20} className="text-indigo-500" />
  };

  return (
    // AFEGIT: dark:bg-slate-900 (encara que els colors específics tenen prioritat, això és fallback)
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg z-[100] animate-fade-in-up min-w-[300px] max-w-[90vw] ${styles[type]}`}>
      <div className="shrink-0">{icons[type]}</div>
      <p className="flex-1 text-sm font-bold">{message}</p>
      <button onClick={onClose} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors opacity-60 hover:opacity-100">
        <X size={16} />
      </button>
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}

// 2. El Hook que faltava (per fer servir "const { toast, showToast } = useToast()")
export function useToast() {
  const [toastConfig, setToastConfig] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType = 'info') => {
    setToastConfig({ message, type });
  };

  const closeToast = () => {
    setToastConfig(null);
  };

  const toast = toastConfig ? (
    <Toast
      message={toastConfig.message}
      type={toastConfig.type}
      onClose={closeToast}
    />
  ) : null;

  return { toast, showToast };
}