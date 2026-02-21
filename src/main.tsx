// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
// Importa l'Error Boundary
import ErrorBoundary from './components/ErrorBoundary'
// [NOU] Importem el nou AuthProvider
import { AuthProvider } from './context/AuthContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Embolcallem l'App dins de l'ErrorBoundary per capturar errors globals */}
    <ErrorBoundary>
      <BrowserRouter>
        {/* [NOU] Embolcallem l'App amb l'AuthProvider perquè tota la UI tingui accés a l'usuari */}
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)