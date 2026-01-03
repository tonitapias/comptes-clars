import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { auth } from './config/firebase';
import LandingPage from './pages/LandingPage';
import TripPage from './pages/TripPage';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Eliminem l'estat lastTripId d'aquí per evitar redireccions automàtiques
  // El gestionarem dins de LandingPage o simplement deixarem que l'usuari navegui.

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium">Carregant la teva sessió...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* CANVI CRÍTIC: Eliminada la redirecció automàtica */}
        <Route path="/" element={<LandingPage user={user} />} />
        
        <Route path="/trip/:tripId" element={<TripPage user={user} />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;