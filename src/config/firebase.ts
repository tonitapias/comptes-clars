import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence, 
  GoogleAuthProvider, 
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
// [NOU] Importem getFunctions
import { getFunctions } from "firebase/functions";

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

// --- FUNCIONS D'AUTENTICACIÓ EXPORTADES ---
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' }); 

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error Google Login:", error);
    throw error;
  }
};

export const registerWithEmail = async (email: string, pass: string, name: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    if (name) {
      await updateProfile(result.user, { displayName: name });
    }
    return result.user;
  } catch (error) {
    throw error;
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    throw error;
  }
};

// --- FIRESTORE (TASCA 2: Offline Persistance ja actiu nativament) ---
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager() 
  })
});

// --- [NOU] CLOUD FUNCTIONS ---
// Configurat per a la regió d'Europa (ajusta segons la teva necessitat)
export const functions = getFunctions(app, 'us-central1');

export const appId = "comptes-clars-v1";