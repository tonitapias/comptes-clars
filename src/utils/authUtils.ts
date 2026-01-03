import { 
  GoogleAuthProvider, 
  linkWithPopup, 
  signInWithPopup, 
  Auth 
} from "firebase/auth";

export const secureAccountLinking = async (auth: Auth) => {
  const provider = new GoogleAuthProvider();
  const user = auth.currentUser;

  if (!user) return;

  try {
    // 1. Intentem vincular el compte anònim amb Google
    await linkWithPopup(user, provider);
    alert("✅ Compte guardat correctament!");
    
    // 2. IMPORTANT: Recarreguem la pàgina per actualitzar l'estat de la interfície
    // Això fa que el botó taronja desaparegui i l'usuari surti com a loguejat
    window.location.reload();
    
  } catch (error: any) {
    // 3. Gestió del conflicte: El compte ja existeix
    if (error.code === 'auth/credential-already-in-use') {
      const confirm = window.confirm(
        "⚠️ Aquest compte de Google ja està registrat.\n\n" +
        "Vols tancar la sessió actual i entrar amb el compte de Google?\n" +
        "(Assegura't de tenir el codi del viatge guardat o copiat!)"
      );

      if (confirm) {
        // Si accepta, fem login normal (substituint la sessió anònima)
        await signInWithPopup(auth, provider);
        window.location.reload();
      }
    } else {
      console.error("Error en vincular:", error);
      alert("Error: " + error.message);
    }
  }
};