import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// --- AUTENTICACIÓ ---
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence)
  .then(() => {
     console.log("✅ Sessió configurada: LOCAL");
  })
  .catch((error) => {
     console.error("❌ Error persistència Auth:", error);
  });

// --- FIRESTORE AMB PERSISTÈNCIA OFFLINE ---
// Utilitzem 'initializeFirestore' en lloc de 'getFirestore' per configurar la cache
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager() // Permet tenir l'app oberta en múltiples pestanyes sense error
  })
});

export const appId = "comptes-clars-v1";