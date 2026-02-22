// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthContextType {
  user: User | null;
  authLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, authLoading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Escoltador global de la sessió separat completament de la UI
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    // [RISC ZERO]: Aquesta línia prevé les fuites de memòria
    return () => unsubscribe();
  }, []);

  // [MILLORA RENDIMENT]: Memoitzem el valor per evitar re-renders en cascada
  // Només es crearà un nou objecte si realment canvia l'usuari o l'estat de càrrega
  const contextValue = useMemo(() => ({
    user,
    authLoading
  }), [user, authLoading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook de consum ràpid
export const useAuth = () => useContext(AuthContext);