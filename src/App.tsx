import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';

import { auth } from './config/firebase';
import LandingPage from './pages/LandingPage';
import TripPage from './pages/TripPage';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    signInAnonymously(auth).catch((e) => console.error("Auth Error", e));
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  if (!auth.app.options.apiKey) return <div className="p-10 text-center">Falta configurar .env.local</div>;
  
  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage user={user} />} />
      <Route path="/trip/:tripId" element={<TripPage user={user} />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}