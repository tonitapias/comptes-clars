import React, { useState } from 'react';
import { 
  Loader2, Mail, Lock, Eye, EyeOff 
} from 'lucide-react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../../config/firebase'; // Ajusta la ruta

type AuthMode = 'initial' | 'login-email' | 'signup-email';

interface AuthFormProps {
    onClose: () => void;
    initialMode?: AuthMode;
}

export default function AuthForm({ onClose, initialMode = 'initial' }: AuthFormProps) {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [loginLoading, setLoginLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // Estat per la confirmació
  const [authError, setAuthError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Visibilitat confirmació

  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    setAuthError('');
    try { 
      await signInWithPopup(auth, new GoogleAuthProvider());
      onClose();
    } catch (e: any) { 
      if (!auth.currentUser) {
        setAuthError(e.message?.includes('closed-by-user') ? 'Finestra tancada' : 'Error Google');
      } else {
        onClose();
      }
    } finally { setLoginLoading(false); }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setAuthError('');
    try {
      if (authMode === 'signup-email') {
        if (password !== confirmPassword) {
            setAuthError("Les contrasenyes no coincideixen");
            setLoginLoading(false);
            return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: email.split('@')[0] });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      setAuthError(err.code === 'auth/email-already-in-use' ? 'Ja registrat' : 'Error accés');
    } finally { setLoginLoading(false); }
  };

  return (
    <div className="space-y-4 px-2">
        {authMode === 'initial' && (
            <>
                <button onClick={handleGoogleLogin} disabled={loginLoading} className="w-full flex items-center justify-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl font-bold transition shadow-lg">
                    {loginLoading ? <Loader2 className="animate-spin text-white/50" /> : <><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" /> Continuar amb Google</>}
                </button>
                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-700"></div></div>
                    <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest"><span className="bg-white dark:bg-slate-900 px-2 text-slate-300">OPCIONS</span></div>
                </div>
                <button onClick={() => setAuthMode('login-email')} className="w-full py-3.5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-white font-bold rounded-xl hover:text-indigo-600 transition flex items-center justify-center gap-2"><Mail size={20}/> Correu electrònic</button>
            </>
        )}

        {(authMode === 'login-email' || authMode === 'signup-email') && (
            <form onSubmit={handleEmailAuth} className="flex flex-col gap-4 animate-fade-in">
                {authError && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-bold border border-red-100">{authError}</div>}
                <div className="space-y-3">
                    {/* EMAIL */}
                    <div className="relative group">
                        <Mail className="absolute left-4 top-4 text-slate-400" size={20}/>
                        <input autoFocus type="email" placeholder="Correu" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3.5 outline-none focus:border-indigo-500 font-bold text-slate-700 dark:text-white" value={email} onChange={e => setEmail(e.target.value)} required/>
                    </div>
                    
                    {/* PASSWORD */}
                    <div className="relative group">
                        <Lock className="absolute left-4 top-4 text-slate-400" size={20}/>
                        <input type={showPassword ? "text" : "password"} placeholder="Contrasenya" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-12 pr-12 py-3.5 outline-none focus:border-indigo-500 font-bold text-slate-700 dark:text-white" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}/>
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-slate-300">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                    </div>

                    {/* --- SOLUCIÓ APLICADA: CONFIRM PASSWORD --- */}
                    {authMode === 'signup-email' && (
                        <div className="relative group animate-fade-in">
                            <Lock className="absolute left-4 top-4 text-slate-400" size={20}/>
                            <input 
                                type={showConfirmPassword ? "text" : "password"} 
                                placeholder="Confirmar contrasenya" 
                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-12 pr-12 py-3.5 outline-none focus:border-indigo-500 font-bold text-slate-700 dark:text-white" 
                                value={confirmPassword} 
                                onChange={e => setConfirmPassword(e.target.value)} 
                                required 
                                minLength={6}
                            />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-4 text-slate-300">
                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    )}
                    {/* ------------------------------------------ */}

                    {authMode === 'login-email' && <div className="flex justify-end"><button type="button" onClick={() => sendPasswordResetEmail(auth, email).then(() => setResetSent(true))} className="text-xs font-bold text-slate-400 hover:text-indigo-600">He oblidat la contrasenya</button></div>}
                </div>
                
                <button disabled={loginLoading} className="mt-2 w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg">
                    {loginLoading ? <Loader2 className="animate-spin" /> : (authMode === 'login-email' ? 'Entrar' : 'Registrar-me')}
                </button>
                
                <div className="flex flex-col gap-3 mt-2 text-center">
                    <button type="button" onClick={() => setAuthMode(authMode === 'login-email' ? 'signup-email' : 'login-email')} className="text-slate-600 dark:text-slate-300 font-bold hover:text-indigo-600 text-sm">
                        {authMode === 'login-email' ? "No tens compte? Registra't" : "Ja tens compte? Entra"}
                    </button>
                    <button type="button" onClick={() => setAuthMode('initial')} className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-wider">Tornar</button>
                </div>
            </form>
        )}
    </div>
  );
}