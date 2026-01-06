import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, ArrowRight, Wallet, Loader2, LogOut, ChevronRight, MapPin, 
  User as UserIcon, Trash2, Sparkles, KeyRound, Mail, Lock, Eye, EyeOff 
} from 'lucide-react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail // <--- NOVA IMPORTACIÓ
} from 'firebase/auth';

import { auth } from '../config/firebase';
import { TripService } from '../services/tripService';
import { CURRENCIES } from '../utils/constants';
import { TripData } from '../types';

interface LandingPageProps {
  user: User | null;
}

type ActionState = 'idle' | 'creating' | 'joining';
type AuthMode = 'initial' | 'login-email' | 'signup-email';

export default function LandingPage({ user }: LandingPageProps) {
  const navigate = useNavigate();
  
  // Estats de l'aplicació
  const [myTrips, setMyTrips] = useState<TripData[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [actionState, setActionState] = useState<ActionState>('idle');
  
  // Estats d'Autenticació
  const [authMode, setAuthMode] = useState<AuthMode>('initial');
  const [loginLoading, setLoginLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [resetSent, setResetSent] = useState(false); // <--- ESTAT PER CONFIRMAR ENVIAMENT

  // Estats visibilitat contrasenya
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estats de Creació/Unió
  const [inputValue, setInputValue] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [greeting, setGreeting] = useState('Hola');

  // 1. Salutació basada en l'hora
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 13) setGreeting('Bon dia');
    else if (hour < 20) setGreeting('Bona tarda');
    else setGreeting('Bona nit');
  }, []);

  // 2. Pre-omplir nom del creador
  useEffect(() => {
    if (actionState === 'creating' && user?.displayName) {
        setCreatorName(user.displayName.split(' ')[0]);
    }
  }, [actionState, user]);

  // 3. Càrrega de viatges
  useEffect(() => {
    async function fetchMyTrips() {
      if (!user) return;
      setLoadingTrips(true);
      try {
        const trips = await TripService.getUserTrips(user.uid);
        trips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setMyTrips(trips);
      } catch (e) { console.error(e); } finally { setLoadingTrips(false); }
    }
    fetchMyTrips();
  }, [user]);

  // --- GESTIÓ DEL LOGIN AMB GOOGLE ---
  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    setAuthError('');
    try { 
      await signInWithPopup(auth, new GoogleAuthProvider()); 
    } catch (e: any) { 
      console.error(e); 
      setAuthError('Error iniciant sessió amb Google.');
    } finally { 
      setLoginLoading(false); 
    }
  };

  // --- NOVA FUNCIÓ: RECUPERAR CONTRASENYA ---
  const handleResetPassword = async () => {
    if (!email) {
        setAuthError("Escriu el teu correu electrònic per recuperar la contrasenya.");
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        setResetSent(true);
        setAuthError(""); 
    } catch (error: any) {
        console.error(error);
        if (error.code === 'auth/user-not-found') {
            setAuthError("No hi ha cap compte amb aquest correu.");
        } else if (error.code === 'auth/invalid-email') {
            setAuthError("El correu electrònic no és vàlid.");
        } else {
            setAuthError("Error enviant el correu. Prova-ho més tard.");
        }
    }
  };

  // --- GESTIÓ DEL LOGIN/REGISTRE AMB EMAIL ---
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setAuthError('');
    setResetSent(false);
    
    try {
      if (authMode === 'signup-email') {
        if (password !== confirmPassword) {
            setAuthError("Les contrasenyes no coincideixen.");
            setLoginLoading(false);
            return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (userCredential.user) {
            const defaultName = email.split('@')[0];
            await updateProfile(userCredential.user, { displayName: defaultName });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
          setAuthError('Aquest correu ja està registrat. Prova a iniciar sessió.');
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          setAuthError('Correu o contrasenya incorrectes.');
      } else if (error.code === 'auth/weak-password') {
          setAuthError('La contrasenya ha de tenir almenys 6 caràcters.');
      } else {
          setAuthError('Error: ' + error.message);
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // --- ACCIONS DE VIATGE (CREAR/UNIR) ---
  const handleQuickAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    if (actionState === 'joining') {
        navigate(`/trip/${inputValue}`);
    } else if (actionState === 'creating' && user) {
        const defaultName = user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Admin';
        const finalName = creatorName.trim() || defaultName;
        
        setIsSubmitting(true);
        try {
            const newId = Math.random().toString(36).substring(2, 9);
            const newTrip: TripData = { 
                id: newId, 
                name: inputValue, 
                users: [finalName], 
                expenses: [], 
                currency: CURRENCIES[0], 
                createdAt: new Date().toISOString(), 
                memberUids: [user.uid] 
            };
            
            await TripService.createTrip(newTrip);
            navigate(`/trip/${newId}`);
        } catch (error) { alert("Error creant el grup"); } finally { setIsSubmitting(false); }
    }
  };

  const handleLeaveTrip = async (tripId: string, tripName: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    const confirm = window.confirm(`Vols deixar de veure el grup "${tripName}"?`);
    if (!confirm || !user) return;

    try {
        await TripService.leaveTrip(tripId, user.uid);
        setMyTrips(prev => prev.filter(t => t.id !== tripId));
    } catch (error) { console.error(error); alert("Error al sortir."); }
  };

  const resetAction = () => { setActionState('idle'); setInputValue(''); setCreatorName(''); };
  const userName = user?.displayName ? user.displayName.split(' ')[0] : (user?.email?.split('@')[0] || 'Viatger');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-indigo-100">
      
      {/* FONS */}
      <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[50%] bg-indigo-200/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[100%] h-[50%] bg-purple-200/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-lg relative z-10 flex flex-col gap-6">
        
        {/* ENCAPÇALAMENT */}
        <div className="flex items-center justify-between px-2">
           <div>
             {user && (
                 <div className="flex items-center gap-2 mb-2">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200"><Wallet size={20} strokeWidth={2.5} /></div>
                    <span className="font-bold text-slate-600 tracking-tight text-sm uppercase">Comptes Clars</span>
                 </div>
             )}
             <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight tracking-tight">
               {user ? (
                 <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">{greeting}, {userName}.</span>
               ) : (
                 <span className="flex items-center gap-3">
                    <span className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-200 block"><Wallet size={32} strokeWidth={2.5} /></span>
                    <span>Comptes Clars</span>
                 </span>
               )}
             </h1>
           </div>
           
           {user && (
             <button onClick={() => { signOut(auth); window.location.reload(); }} className="bg-white/80 backdrop-blur-sm p-3 rounded-2xl border border-white text-slate-400 hover:text-red-500 hover:scale-105 transition-all shadow-sm"><LogOut size={24} /></button>
           )}
        </div>

        {/* TARGETA PRINCIPAL */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl shadow-indigo-900/5 border border-white p-3 ring-1 ring-white/50">
            <div className="p-4 md:p-6">
                
                {/* 1. NO LOGUEJAT (Google + Email Flow) */}
                {!user && (
                    <div className="flex flex-col gap-6">
                        
                        {/* PANTALLA INICIAL */}
                        {authMode === 'initial' && (
                            <>
                                <p className="text-center text-slate-600 font-medium mb-2 text-base">Inicia sessió per gestionar els teus grups i despeses de forma segura.</p>
                                
                                <button onClick={handleGoogleLogin} disabled={loginLoading} className="group w-full py-5 bg-[#1a1a1a] hover:bg-black text-white font-bold text-lg rounded-2xl shadow-xl shadow-slate-300/50 transition-all transform active:scale-[0.98] flex items-center justify-center gap-4 relative overflow-hidden">
                                    {loginLoading ? <Loader2 className="animate-spin text-white/50" /> : (<><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="G"/><span className="tracking-wide">Entrar amb Google</span></>)}
                                </button>

                                <div className="relative flex py-2 items-center">
                                    <div className="flex-grow border-t border-slate-200"></div>
                                    <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-medium">o</span>
                                    <div className="flex-grow border-t border-slate-200"></div>
                                </div>

                                <button 
                                    onClick={() => setAuthMode('login-email')} 
                                    className="w-full py-4 bg-white border border-slate-200 text-slate-700 font-bold text-lg rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition shadow-sm flex items-center justify-center gap-3"
                                >
                                    <Mail size={22} className="text-slate-500"/>
                                    Fer servir correu electrònic
                                </button>
                            </>
                        )}

                        {/* FORMULARI EMAIL (Login o Registre) */}
                        {(authMode === 'login-email' || authMode === 'signup-email') && (
                            <form onSubmit={handleEmailAuth} className="animate-fade-in flex flex-col gap-4">
                                <div className="text-center mb-2">
                                    <h3 className="text-xl font-bold text-slate-800">
                                        {authMode === 'login-email' ? 'Benvingut de nou' : 'Crear compte nou'}
                                    </h3>
                                    <p className="text-sm text-slate-400">Introdueix les teves dades per continuar</p>
                                </div>

                                {authError && (
                                    <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
                                        <div className="w-1 h-1 bg-red-400 rounded-full"></div> {authError}
                                    </div>
                                )}
                                
                                {resetSent && (
                                    <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-sm font-medium border border-emerald-100 flex items-center gap-2 mb-2">
                                        <div className="w-1 h-1 bg-emerald-400 rounded-full"></div> Correu de recuperació enviat! Revisa la teva safata.
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {/* Email */}
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-4 text-slate-400" size={20}/>
                                        <input 
                                            autoFocus
                                            type="email" 
                                            placeholder="El teu correu electrònic" 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition font-medium text-slate-700 placeholder:font-normal"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>

                                    {/* Contrasenya */}
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-4 text-slate-400" size={20}/>
                                        <input 
                                            type={showPassword ? "text" : "password"} 
                                            placeholder="Contrasenya" 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-12 py-3.5 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition font-medium text-slate-700 placeholder:font-normal"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            required
                                            minLength={6}
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 focus:outline-none"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                    
                                    {/* ENLLAÇ RECUPERAR CONTRASENYA (Només en mode login) */}
                                    {authMode === 'login-email' && (
                                        <div className="flex justify-end">
                                            <button 
                                                type="button"
                                                onClick={handleResetPassword}
                                                className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition"
                                            >
                                                He oblidat la contrasenya
                                            </button>
                                        </div>
                                    )}

                                    {/* Confirmar Contrasenya (NOMÉS REGISTRE) */}
                                    {authMode === 'signup-email' && (
                                        <div className="relative animate-fade-in">
                                            <Lock className="absolute left-4 top-4 text-slate-400" size={20}/>
                                            <input 
                                                type={showConfirmPassword ? "text" : "password"} 
                                                placeholder="Repeteix la contrasenya" 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-12 py-3.5 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition font-medium text-slate-700 placeholder:font-normal"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                required
                                                minLength={6}
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 focus:outline-none"
                                            >
                                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <button disabled={loginLoading} className="mt-2 w-full bg-slate-800 text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition flex items-center justify-center gap-2 shadow-lg shadow-slate-200">
                                    {loginLoading ? <Loader2 className="animate-spin" /> : (authMode === 'login-email' ? 'Entrar' : 'Registrar-me')}
                                </button>

                                <div className="flex flex-col gap-3 mt-2">
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setAuthMode(authMode === 'login-email' ? 'signup-email' : 'login-email');
                                            setAuthError('');
                                            setResetSent(false);
                                            setConfirmPassword('');
                                            setShowPassword(false); 
                                            setShowConfirmPassword(false);
                                        }} 
                                        className="text-indigo-600 font-bold hover:text-indigo-800 text-sm transition"
                                    >
                                        {authMode === 'login-email' ? 'No tens compte? Crea\'n un gratis' : 'Ja tens compte? Inicia sessió'}
                                    </button>
                                    
                                    <button type="button" onClick={() => { setAuthMode('initial'); setAuthError(''); setResetSent(false); }} className="text-slate-400 hover:text-slate-600 text-sm font-medium transition">
                                        ← Tornar a l'inici
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}

                {/* 2. MODE LOGUEJAT (Llista de viatges i accions) */}
                {user && (
                    <div className="flex flex-col h-full min-h-[400px]">
                        <div className="flex items-center justify-between mb-6 px-1">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Els teus grups</h3>
                            <button onClick={() => setActionState(actionState === 'creating' ? 'idle' : 'creating')} className="group flex items-center gap-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white pl-4 pr-3 py-2 rounded-full transition-all shadow-sm">
                                <span className="text-xs font-bold">NOU</span><div className="bg-white/20 rounded-full p-0.5"><Plus size={18} /></div>
                            </button>
                        </div>

                        {/* FORMULARI CREAR */}
                        {actionState === 'creating' && (
                            <form onSubmit={handleQuickAction} className="animate-fade-in mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-1"><label className="block text-xs font-bold text-slate-400 uppercase ml-1">Nom del viatge</label><button type="button" onClick={resetAction} className="text-xs font-bold text-slate-400 hover:text-slate-600">Cancel·lar</button></div>
                                        <input autoFocus type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none text-base font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100 transition" placeholder="Ex: Menorca" value={inputValue} onChange={e => setInputValue(e.target.value)}/>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="relative flex-1">
                                             <UserIcon size={20} className="absolute left-3 top-3.5 text-slate-400"/>
                                             <input type="text" className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 outline-none text-base font-medium focus:ring-2 focus:ring-indigo-100 transition" placeholder="El teu nom" value={creatorName} onChange={e => setCreatorName(e.target.value)}/>
                                        </div>
                                        <button disabled={!inputValue || !creatorName || isSubmitting} className="bg-indigo-600 text-white px-5 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition"><ArrowRight size={24}/></button>
                                    </div>
                                </div>
                            </form>
                        )}
                        
                        {/* FORMULARI UNIR-SE */}
                        {actionState === 'joining' && (
                            <div className="animate-fade-in mb-6 bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm ring-4 ring-indigo-50">
                                <div className="flex justify-between items-center mb-3"><label className="text-xs font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1"><KeyRound size={14}/> Codi d'invitació</label><button type="button" onClick={resetAction} className="text-xs font-bold text-slate-400 hover:text-slate-600">Tancar</button></div>
                                <form onSubmit={handleQuickAction} className="flex gap-2">
                                    <input autoFocus type="text" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-base font-bold text-slate-800 placeholder:font-normal uppercase tracking-widest font-mono" placeholder="XXX-YYY" value={inputValue} onChange={e => setInputValue(e.target.value)}/>
                                    <button disabled={!inputValue || isSubmitting} className="bg-indigo-600 text-white px-5 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition">{isSubmitting ? <Loader2 className="animate-spin" size={20}/> : <ArrowRight size={20}/>}</button>
                                </form>
                            </div>
                        )}

                        {/* LLISTA DE VIATGES */}
                        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar -mr-2">
                             {loadingTrips ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3"><Loader2 className="animate-spin" size={32}/><span className="text-sm font-medium">Carregant grups...</span></div>
                            ) : myTrips.length > 0 ? (
                                <div className="space-y-4 pb-4">
                                    {myTrips.map(trip => (
                                        <div key={trip.id} onClick={() => navigate(`/trip/${trip.id}`)} className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-indigo-200 cursor-pointer transition-all group">
                                            <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-bl-[4rem] -z-0 group-hover:scale-150 transition-transform duration-500 origin-top-right"></div>
                                            <div className="relative z-10 flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-xl group-hover:text-indigo-700 transition-colors mb-1">{trip.name}</h4>
                                                    <div className="flex items-center gap-3"><span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 flex items-center gap-1"><MapPin size={12} /> {trip.currency.code}</span><span className="text-xs text-slate-400 font-medium">{new Date(trip.createdAt).toLocaleDateString()}</span></div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button onClick={(e) => handleLeaveTrip(trip.id, trip.name, e)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all" title="Ocultar"><Trash2 size={20} /></button>
                                                    <div className="bg-slate-50 p-3 rounded-full text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm"><ChevronRight size={20} /></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
                                    <div className="bg-white p-4 rounded-full shadow-sm mb-4"><Sparkles className="text-indigo-400" size={32} /></div>
                                    <p className="text-lg font-bold text-slate-600">Comencem?</p>
                                    <p className="text-sm text-slate-400 mt-2 max-w-[200px] leading-relaxed">Crea el teu primer grup amb el botó "Nou".</p>
                                </div>
                            )}
                        </div>

                        {actionState === 'idle' && (
                             <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                                <button onClick={() => setActionState('joining')} className="text-sm font-bold text-slate-400 hover:text-indigo-600 transition flex items-center justify-center gap-2 w-full"><KeyRound size={16}/> Tens un codi d'invitació?</button>
                             </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
      <style>{` .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } @keyframes pulse-slow { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.3; transform: scale(1.05); } } .animate-pulse-slow { animation: pulse-slow 8s infinite ease-in-out; } `}</style>
    </div>
  );
}