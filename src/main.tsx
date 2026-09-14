// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
// Importa l'Error Boundary
import ErrorBoundary from './components/ErrorBoundary'
// Importem el nou AuthProvider
import { AuthProvider } from './context/AuthContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Embolcallem l'App dins de l'ErrorBoundary per capturar errors globals */}
    <ErrorBoundary>
      <BrowserRouter>
        {/* Embolcallem l'App amb l'AuthProvider perquè tota la UI tingui accés a l'usuari */}
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)

// [NOU] Sentry es carrega i s'inicialitza després del primer render (import
// dinàmic + idle callback) perquè no engreixi el chunk principal ni bloquegi
// el temps fins a interactiu. Tradeoff acceptat: un error durant aquesta
// finestra molt curta abans que carregui no queda registrat.
function initSentry() {
  import('@sentry/react').then((Sentry) => {
    Sentry.init({
      // El DSN es llegeix de les teves variables d'entorn (.env)
      dsn: import.meta.env.VITE_SENTRY_DSN,
      // Detecta automàticament si estem a desenvolupament o producció
      environment: import.meta.env.MODE,
      // Guardem traces de rendiment (Posa-ho al 10% - 0.1 - a producció per no fondre la quota gratuïta)
      tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
    });
  });
}

if ('requestIdleCallback' in window) {
  requestIdleCallback(initSentry);
} else {
  setTimeout(initSentry, 200);
}