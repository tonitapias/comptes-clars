import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

import { auth } from './config/firebase';
import LandingPage from './pages/LandingPage';
import TripDetails from './pages/TripDetails';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // NOU: Estat per recordar l'últim viatge visitat
  const [lastTripId, setLastTripId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Recuperem l'ID de l'últim viatge del localStorage (si existeix)
    // Aquest valor es guarda al fitxer TripPage.tsx quan entres en un grup.
    const storedTripId = localStorage.getItem('cc-last-trip-id');
    if (storedTripId) {
      setLastTripId(storedTripId);
    }

    // 2. Escolta d'autenticació de Firebase
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Pantalla de càrrega
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
        {/* MODIFICACIÓ CLAU: Lògica de redirecció a la ruta arrel */}
        <Route 
          path="/" 
          element={
            // Si tenim usuari I tenim un últim viatge guardat -> Redirigim directament
            user && lastTripId ? (
              <Navigate to={`/trip/${lastTripId}`} replace />
            ) : (
              // Si no (o si l'usuari ha tancat sessió del grup manualment), mostrem la Landing
              <LandingPage user={user} />
            )
          } 
        />
        
        <Route path="/trip/:tripId" element={<TripDetails user={user} />} />
        
        {/* Qualsevol ruta desconeguda torna a l'inici */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;