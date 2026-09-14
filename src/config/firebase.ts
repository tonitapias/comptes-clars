// src/config/firebase.ts
import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
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

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const app = initializeApp(firebaseConfig);

// ============================================================================
// [RISC ZERO]: FIREBASE APP CHECK
// ============================================================================
try {
  if (typeof window !== "undefined" && import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
    if (import.meta.env.PROD) {
      // La clau a VITE_RECAPTCHA_SITE_KEY és una clau reCAPTCHA v3 clàssica
      // (creada a google.com/recaptcha/admin), no una clau reCAPTCHA
      // Enterprise (consola separada, Google Cloud Console) — usar
      // ReCaptchaEnterpriseProvider amb aquesta clau donava sempre 403.
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      console.log("🛡️ App Check inicialitzat (Mode Producció).");
    } else {
      console.log("🛠️ App Check en pausa (Mode Local) per evitar bloquejos de reCAPTCHA.");
    }
  }
} catch (error) {
  console.warn("⚠️ No s'ha pogut inicialitzar App Check:", error);
}

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
    console.error("[Auth] Error en login de Google:", error);
    throw error;
  }
};

export const registerWithEmail = async (email: string, pass: string, name: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    if (name && result.user) {
      await updateProfile(result.user, { displayName: name });
    }
    return result.user;
  } catch (error) {
    console.error("[Auth] Error en el registre:", error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error("[Auth] Error en login d'email:", error);
    throw error;
  }
};

// --- FIRESTORE ---
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager() 
  }),
  // [MILLORA FASE 2]: Firestore ignora automàticament els "undefined" a nivell natiu.
  // Ens permet eliminar per complet les desastroses funcions JSON.parse(JSON.stringify())
  ignoreUndefinedProperties: true 
});

export const appId = "comptes-clars-v1";