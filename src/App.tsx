import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Loader2 } from 'lucide-react'; // Fem servir la icona de càrrega

import { auth } from './config/firebase';
import LandingPage from './pages/LandingPage';
import TripDetails from './pages/TripDetails';

function App() {
  const [user, setUser] = useState<User | null>(null);
  // Aquest estat és la CLAU: comencem "carregant"
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Això escolta Firebase. S'executa només arrencar l'app.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false); // JA ESTÀ! Firebase ha respost (sigui sí o no)
    });

    return () => unsubscribe();
  }, []);

  // MENTRE FIREBASE PENSA... mostrem una pantalla de càrrega blanca i neta
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium">Carregant la teva sessió...</p>
      </div>
    );
  }

  // UN COP FIREBASE HA ACABAT, mostrem l'app real
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage user={user} />} />
        
        {/* Rutes protegides o públiques segons necessitis */}
        <Route path="/trip/:tripId" element={<TripDetails user={user} />} />
        
        {/* Qualsevol ruta desconeguda torna a l'inici */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;