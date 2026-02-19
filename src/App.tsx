import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next'; // <-- NOU IMPORT

import { auth } from './config/firebase';
import './config/i18n'; // <-- INICIALITZEM I18N EN ARRENCAR L'APP
import LandingPage from './pages/LandingPage';
import TripPage from './pages/TripPage';
import ProtectedRoute from './components/ProtectedRoute';
import { useTheme } from './hooks/useTheme';
import { Footer } from './components/Footer';

function App() {
  useTheme(); 
  const { t } = useTranslation(); // <-- EXTRAIEM LA FUNCIÓ DE TRADUCCIÓ
  
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="flex-grow flex flex-col">
        {authLoading ? (
          <div className="flex-grow flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
            {/* [RISC ZERO]: Substituïm LITERALS.COMMON.LOADING_SESSION per t('COMMON.LOADING_SESSION') */}
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
    </div>
  );
}

export default App;