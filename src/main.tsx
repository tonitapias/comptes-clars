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

// [NOU] Sentry: src/utils/errorHandler.ts ja en fa un import estàtic
// (l'usa logAppError, cridat per ErrorBoundary i altres hooks sempre actius),
// així que el paquet es descarrega igualment a cada càrrega — no té sentit
// fer-ne un import dinàmic aquí. Només movem Sentry.init() després del
// render() perquè no bloquegi el primer commit de React.
import * as Sentry from "@sentry/react";

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

Sentry.init({
  // El DSN es llegeix de les teves variables d'entorn (.env)
  dsn: import.meta.env.VITE_SENTRY_DSN,
  // Detecta automàticament si estem a desenvolupament o producció
  environment: import.meta.env.MODE,
  // Guardem traces de rendiment (Posa-ho al 10% - 0.1 - a producció per no fondre la quota gratuïta)
  tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
});