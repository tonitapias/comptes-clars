import React, { useState, useEffect } from 'react';
import { 
  Loader2, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle 
} from 'lucide-react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../../config/firebase'; 

type AuthMode = 'initial' | 'login-email' | 'signup-email';
type ErrorField = 'none' | 'email' | 'password' | 'both';

interface AuthFormProps {
    onClose: () => void;
    initialMode?: AuthMode;
}

export default function AuthForm({ onClose, initialMode = 'initial' }: AuthFormProps) {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Camps del formulari
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); 
  
  // Gestió d'errors
  const [authError, setAuthError] = useState('');
  const [errorField, setErrorField] = useState<ErrorField>('none');
  const [isShaking, setIsShaking] = useState(false);

  // Estats per al reset de password
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Netejar errors quan l'usuari escriu
  useEffect(() => {
    if (authError) {
        setAuthError('');
        setErrorField('none');
    }
  }, [email, password, confirmPassword]);

  // Trigger animació shake
  const triggerError = (msg: string, field: ErrorField) => {
    setAuthError(msg);
    setErrorField(field);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    setLoginLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    setAuthError('');
    try { 
      await signInWithPopup(auth, new GoogleAuthProvider());
      onClose();
    } catch (e: any) { 
      if (!auth.currentUser) {
        // No mostrem error si l'usuari tanca el popup voluntàriament
        if (!e.message?.includes('closed-by-user')) {
             triggerError('No s\'ha pogut iniciar amb Google', 'none');
        }
      } else {
        onClose();
      }
    } finally { setLoginLoading(false); }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setAuthError('');
    setResetSent(false);

    try {
      if (authMode === 'signup-email') {
        if (password !== confirmPassword) {
            triggerError("Les contrasenyes no coincideixen", 'password');
            return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: email.split('@')[0] });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      // Mapping d'errors de Firebase a camps visuals
      if (err.code === 'auth/email-already-in-use') triggerError('Aquest correu ja està registrat', 'email');
      else if (err.code === 'auth/invalid-email') triggerError('Format de correu incorrecte', 'email');
      else if (err.code === 'auth/user-not-found') triggerError('No existeix cap compte amb aquest correu', 'email');
      else if (err.code === 'auth/wrong-password') triggerError('Contrasenya incorrecta', 'password');
      else if (err.code === 'auth/invalid-credential') triggerError('Credencials incorrectes', 'both');
      else if (err.code === 'auth/weak-password') triggerError('La contrasenya ha de tenir 6 caràcters mínim', 'password');
      else triggerError('Error d\'accés. Revisa les dades.', 'both');
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
        triggerError("Escriu el teu correu al camp de dalt primer.", 'email');
        return;
    }
    
    setResetLoading(true);
    setAuthError('');
    setResetSent(false);

    try {
        await sendPasswordResetEmail(auth, email);
        setResetSent(true);
    } catch (error: any) {
        console.error(error);
        if (error.code === 'auth/user-not-found') {
            triggerError("No hi ha cap compte amb aquest correu.", 'email');
        } else if (error.code === 'auth/invalid-email') {
            triggerError("El format del correu no és vàlid.", 'email');
        } else {
            triggerError("No s'ha pogut enviar el correu.", 'none');
        }
    } finally {
        setResetLoading(false);
    }
  };

  // Helper per classes d'input
  const getInputClasses = (hasError: boolean) => `
    w-full pl-12 pr-12 py-3.5 rounded-xl outline-none font-bold transition-all duration-200
    ${hasError 
        ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 placeholder:text-rose-300 focus:ring-4 focus:ring-rose-500/20' 
        : 'bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
    }
  `;

  return (
    <div className="space-y-4 px-2 overflow-hidden">
        {/* Estils Inline per l'animació shake (Risc Zero: no toquem CSS global) */}
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
          }
          .animate-shake { animation: shake 0.4s ease-in-out; }
        `}</style>

        {authMode === 'initial' && (
            <>
                <button onClick={handleGoogleLogin} disabled={loginLoading} className="w-full flex items-center justify-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl font-bold transition shadow-lg hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-indigo-500/30">
                    {loginLoading ? <Loader2 className="animate-spin text-white/50" /> : <><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="" aria-hidden="true" /> Continuar amb Google</>}
                </button>
                <div className="relative my-4" role="separator">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-700"></div></div>
                    <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest"><span className="bg-white dark:bg-slate-900 px-2 text-slate-300">OPCIONS</span></div>
                </div>
                <button onClick={() => setAuthMode('login-email')} className="w-full py-3.5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-white font-bold rounded-xl hover:text-indigo-600 hover:border-indigo-100 transition flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-slate-200 dark:focus:ring-slate-700 active:bg-slate-50">
                    <Mail size={20} aria-hidden="true"/> Correu electrònic
                </button>
            </>
        )}

        {(authMode === 'login-email' || authMode === 'signup-email') && (
            <form onSubmit={handleEmailAuth} className={`flex flex-col gap-4 animate-fade-in ${isShaking ? 'animate-shake' : ''}`}>
                
                {/* Missatges d'Error Genèrics (Feedback visual superior) */}
                {authError && (
                    <div role="alert" className="bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300 p-3 rounded-xl text-sm font-bold border border-rose-100 dark:border-rose-800 flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="shrink-0 mt-0.5" size={16} />
                        <span>{authError}</span>
                    </div>
                )}

                {/* Missatge d'Èxit Reset Password */}
                {resetSent && (
                    <div role="status" className="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300 p-3 rounded-xl text-sm font-bold border border-emerald-100 dark:border-emerald-800 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle size={16} />
                        <span>Revisa el teu correu per canviar la contrasenya.</span>
                    </div>
                )}

                <div className="space-y-3">
                    {/* EMAIL */}
                    <div className="relative group">
                        <label htmlFor="auth-email" className="sr-only">Correu electrònic</label>
                        <div className={`absolute left-4 top-4 pointer-events-none transition-colors ${errorField === 'email' || errorField === 'both' ? 'text-rose-500' : 'text-slate-400 group-focus-within:text-indigo-500'}`}>
                            <Mail size={20} aria-hidden="true"/>
                        </div>
                        <input 
                            id="auth-email"
                            name="email"
                            autoFocus 
                            type="email" 
                            autoComplete="username email"
                            placeholder="nom@exemple.com" 
                            className={getInputClasses(errorField === 'email' || errorField === 'both')}
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            required
                            aria-invalid={errorField === 'email' || errorField === 'both'}
                        />
                        {/* Icona d'alerta interna per A11y */}
                        {(errorField === 'email' || errorField === 'both') && (
                            <div className="absolute right-4 top-4 text-rose-500 pointer-events-none animate-in zoom-in">
                                <AlertCircle size={20} />
                            </div>
                        )}
                    </div>
                    
                    {/* PASSWORD */}
                    <div className="relative group">
                        <label htmlFor="auth-password" className="sr-only">Contrasenya</label>
                        <div className={`absolute left-4 top-4 pointer-events-none transition-colors ${errorField === 'password' || errorField === 'both' ? 'text-rose-500' : 'text-slate-400 group-focus-within:text-indigo-500'}`}>
                            <Lock size={20} aria-hidden="true"/>
                        </div>
                        <input 
                            id="auth-password"
                            name="password"
                            type={showPassword ? "text" : "password"} 
                            autoComplete={authMode === 'login-email' ? "current-password" : "new-password"}
                            placeholder="••••••••" 
                            className={getInputClasses(errorField === 'password' || errorField === 'both')}
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            required 
                            minLength={6}
                            aria-invalid={errorField === 'password' || errorField === 'both'}
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)} 
                            className={`absolute right-4 top-4 transition-colors focus:outline-none ${errorField === 'password' || errorField === 'both' ? 'text-rose-400 hover:text-rose-600' : 'text-slate-300 hover:text-slate-500 focus:text-indigo-500'}`}
                            aria-label={showPassword ? "Ocultar contrasenya" : "Mostrar contrasenya"}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    {authMode === 'signup-email' && (
                        <div className="relative group animate-fade-in">
                            <label htmlFor="auth-confirm-password" className="sr-only">Confirmar contrasenya</label>
                            <div className={`absolute left-4 top-4 pointer-events-none transition-colors ${errorField === 'password' ? 'text-rose-500' : 'text-slate-400 group-focus-within:text-indigo-500'}`}>
                                <Lock size={20} aria-hidden="true"/>
                            </div>
                            <input 
                                id="auth-confirm-password"
                                name="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"} 
                                autoComplete="new-password"
                                placeholder="Confirmar contrasenya" 
                                className={getInputClasses(errorField === 'password')}
                                value={confirmPassword} 
                                onChange={e => setConfirmPassword(e.target.value)} 
                                required 
                                minLength={6}
                                aria-invalid={errorField === 'password'}
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                                className="absolute right-4 top-4 text-slate-300 hover:text-slate-500 transition-colors focus:outline-none focus:text-indigo-500"
                                aria-label={showConfirmPassword ? "Ocultar confirmació" : "Mostrar confirmació"}
                            >
                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    )}

                    {/* Botó He oblidat la contrasenya */}
                    {authMode === 'login-email' && (
                        <div className="flex justify-end">
                            <button 
                                type="button" 
                                onClick={handleResetPassword} 
                                disabled={resetLoading || resetSent}
                                className="text-xs font-bold text-slate-400 hover:text-indigo-600 disabled:opacity-50 transition-colors flex items-center gap-1 focus:outline-none focus:underline"
                            >
                                {resetLoading && <Loader2 size={12} className="animate-spin" />}
                                {resetSent ? "Correu enviat!" : "He oblidat la contrasenya"}
                            </button>
                        </div>
                    )}
                </div>
                
                <button disabled={loginLoading} className="mt-2 w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-200/50 dark:shadow-none disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-indigo-500/30 active:scale-[0.98]">
                    {loginLoading ? <Loader2 className="animate-spin" /> : (authMode === 'login-email' ? 'Entrar' : 'Registrar-me')}
                </button>
                
                <div className="flex flex-col gap-3 mt-2 text-center">
                    <button type="button" onClick={() => { setAuthMode(authMode === 'login-email' ? 'signup-email' : 'login-email'); setAuthError(''); setResetSent(false); }} className="text-slate-600 dark:text-slate-300 font-bold hover:text-indigo-600 text-sm transition-colors focus:outline-none focus:underline">
                        {authMode === 'login-email' ? "No tens compte? Registra't" : "Ja tens compte? Entra"}
                    </button>
                    <button type="button" onClick={() => setAuthMode('initial')} className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none focus:text-slate-600">Tornar</button>
                </div>
            </form>
        )}
    </div>
  );
}