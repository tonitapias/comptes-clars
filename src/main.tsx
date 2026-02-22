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

// [NOU] Importem Sentry per a l'Error Tracking
import * as Sentry from "@sentry/react";

// [NOU] Inicialitzem Sentry just abans de muntar l'aplicació
Sentry.init({
  // El DSN es llegeix de les teves variables d'entorn (.env)
  dsn: import.meta.env.VITE_SENTRY_DSN,
  
  // Detecta automàticament si estem a desenvolupament o producció
  environment: import.meta.env.MODE,
  
  // Guardem traces de rendiment (Posa-ho al 10% - 0.1 - a producció per no fondre la quota gratuïta)
  tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
});

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