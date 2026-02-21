// src/App.tsx
import { Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next'; 

import './config/i18n'; 
import LandingPage from './pages/LandingPage';
import TripPage from './pages/TripPage';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary'; // <-- NOU IMPORT
import { useTheme } from './hooks/useTheme';
import { Footer } from './components/Footer';
import { useAuth } from './context/AuthContext';

function App() {
  useTheme(); 
  const { t } = useTranslation(); 
  
  const { user, authLoading } = useAuth();
  
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <ErrorBoundary> {/* <-- ERROR BOUNDARY EMBOLCALLANT TOT EL CONTINGUT */}
        <div className="flex-grow flex flex-col">
          {authLoading ? (
            <div className="flex-grow flex flex-col items-center justify-center">
              <Loader2 className="h-10 w-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
              <p className="text-slate-400 text-sm font-medium">{t('COMMON.LOADING_SESSION')}</p>
            </div>
          ) : (
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
          )}
        </div>
        <Footer />
      </ErrorBoundary>
    </div>
  );
}

export default App;