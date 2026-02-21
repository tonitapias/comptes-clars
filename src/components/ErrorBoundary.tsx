// src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';
// [CANVI]: Importem el nostre nou logger
import { logAppError } from '../utils/errorHandler';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // [CANVI]: Substituïm el console.error estàndard per l'adaptador centralitzat
    logAppError(error, errorInfo, 'ErrorBoundary (React Tree Crash)');
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
            <h2 className="text-2xl font-black text-rose-600 mb-4 tracking-tight">
              Vaja! Alguna cosa ha fallat.
            </h2>
            <p className="text-slate-500 mb-6 text-sm leading-relaxed">
              L'aplicació ha trobat un error inesperat. No pateixis, les teves dades al servidor estan segures i monitoritzades.
            </p>
            
            {import.meta.env.DEV && this.state.error && (
              <pre className="bg-slate-900 p-4 rounded-xl text-[10px] text-left overflow-auto mb-6 max-h-40 text-rose-400 font-mono shadow-inner">
                {this.state.error.toString()}
              </pre>
            )}

            <button
              onClick={this.handleReload}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-slate-900/20 active:scale-95"
            >
              Recarregar l'aplicació
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;