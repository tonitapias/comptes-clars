// src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';

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
    // Actualitza l'estat perquè el següent renderitzi la UI alternativa
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error no controlat:', error, errorInfo);
    // Aquí podries enviar l'error a un servei de log com Sentry
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Vaja! Alguna cosa ha anat malament.
            </h2>
            <p className="text-gray-600 mb-6">
              L'aplicació ha trobat un error inesperat. No pateixis, les teves dades estan segures.
            </p>
            
            {/* Opcional: Mostra l'error en desenvolupament */}
            {import.meta.env.DEV && this.state.error && (
              <pre className="bg-gray-100 p-2 rounded text-xs text-left overflow-auto mb-6 max-h-32 text-red-800">
                {this.state.error.toString()}
              </pre>
            )}

            <button
              onClick={this.handleReload}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
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