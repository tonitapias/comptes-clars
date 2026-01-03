import { initializeApp } from "firebase/app";
// 1. IMPORTEM 'setPersistence' i 'browserLocalPersistence'
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

// 2. AFEGIM AQUEST BLOC: Això força que la sessió es guardi al disc del mòbil
setPersistence(auth, browserLocalPersistence)
  .then(() => {
     // Persistència configurada correctament
     console.log("Sessió configurada per recordar l'usuari.");
  })
  .catch((error) => {
     console.error("Error configurant la persistència:", error);
  });

export const db = getFirestore(app);
// Assegura't que l'appId és correcte (el nom de la col·lecció a Firestore)
export const appId = "comptes-clars";