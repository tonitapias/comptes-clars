import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configuració de persistència simplificada i robusta per evitar problemes de sessió
setPersistence(auth, browserLocalPersistence)
  .then(() => {
     console.log("✅ Sessió configurada: LOCAL");
  })
  .catch((error) => {
     console.error("❌ Error persistència:", error);
  });

export const db = getFirestore(app);

// --- CORRECCIÓ CLAU AQUÍ ---
// Canviem 'comptes-clars' per 'comptes-clars-v1' perquè coincideixi amb la teva BD real.
export const appId = "comptes-clars-v1";