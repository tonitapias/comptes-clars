import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { auth } from './config/firebase';
import LandingPage from './pages/LandingPage';
import TripPage from './pages/TripPage';
import ProtectedRoute from './components/ProtectedRoute';
import { useTheme } from './hooks/useTheme';
import { Footer } from './components/Footer';
import { LITERALS } from './constants/literals'; 

function App() {
  useTheme(); 
  
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // [SAFE-FIX]: Hem eliminat el "if (authLoading) return <FullPageSpinner />" per
  // no blocar el muntatge del Layout de l'App Shell (Fons principal i Footer).
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="flex-grow flex flex-col">
        {authLoading ? (
          // [SAFE-FIX]: Spinner localitzat dins de l'estructura general ja pintada.
          <div className="flex-grow flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
            <p className="text-slate-400 text-sm font-medium">{LITERALS.COMMON.LOADING_SESSION}</p>
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