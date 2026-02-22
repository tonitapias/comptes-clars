// src/App.tsx
import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next'; 

import './config/i18n'; 
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary'; 
import { useTheme } from './hooks/useTheme';
import { Footer } from './components/Footer';
import { useAuth } from './context/AuthContext';

// [MILLORA RISC ZERO]: Importacions dinàmiques (Lazy Loading)
// El codi de TripPage només es descarregarà si l'usuari hi entra.
const LandingPage = lazy(() => import('./pages/LandingPage'));
const TripPage = lazy(() => import('./pages/TripPage'));

function App() {
  useTheme(); 
  const { t } = useTranslation(); 
  
  const { user, authLoading } = useAuth();
  
  // [MILLORA RISC ZERO]: Extraiem el Loader per reutilitzar-lo al Suspense
  const LoadingScreen = () => (
    <div className="flex-grow flex flex-col items-center justify-center">
      <Loader2 className="h-10 w-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
      <p className="text-slate-400 text-sm font-medium">{t('COMMON.LOADING_SESSION', 'Carregant...')}</p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <ErrorBoundary> 
        <div className="flex-grow flex flex-col">
          {authLoading ? (
            <LoadingScreen />
          ) : (
            // [MILLORA RISC ZERO]: Suspense gestiona la càrrega asíncrona dels components
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route path="/" element={<LandingPage user={user} />} />
                <Route 
                  path="/trip/:tripId" 
                  element={
                    <ProtectedRoute user={user}>
                      <TripPage user={user} />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </Suspense>
          )}
        </div>
        <Footer />
      </ErrorBoundary>
    </div>
  );
}

export default App;