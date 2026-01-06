import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  sendPasswordResetEmail
} from 'firebase/auth';

import { auth } from '../config/firebase';
import { TripService } from '../services/tripService';
import { CURRENCIES } from '../utils/constants';
import { TripData } from '../types';
import Modal from '../components/Modal';

interface LandingPageProps {
  user: User | null;
}

type ActionState = 'idle' | 'creating' | 'joining';
type AuthMode = 'initial' | 'login-email' | 'signup-email';

export default function LandingPage({ user }: LandingPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const inviteCode = searchParams.get('join');
  
  // Estats de l'aplicació
  const [myTrips, setMyTrips] = useState<TripData[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [actionState, setActionState] = useState<ActionState>('idle');
  
  // Estats d'Autenticació
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('initial');
  const [loginLoading, setLoginLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Estats visibilitat contrasenya
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estats de Creació/Unió
  const [inputValue, setInputValue] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [greeting, setGreeting] = useState('Hola');
  const [isJoining, setIsJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      if (!user) {
          setMyTrips([]);
          return;
      }
      setLoadingTrips(true);
      try {
        const trips = await TripService.getUserTrips(user.uid);
        trips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setMyTrips(trips);
      } catch (e) { console.error(e); } finally { setLoadingTrips(false); }
    }
    fetchMyTrips();
  }, [user]);

  // 4. AUTO-JOIN: Si tenim user i inviteCode, ens unim automàticament
  useEffect(() => {
    const handleAutoJoin = async () => {
      if (user && inviteCode) {
        setIsJoining(true);
        // Tanquem el modal si estava obert
        setIsAuthModalOpen(false); 
        try {
          await TripService.joinTripViaLink(inviteCode, user);
          setSearchParams({});
          navigate(`/trip/${inviteCode}`);
        } catch (error) {
          console.error(error);
          setErrorMsg("No s'ha pogut unir al grup.");
        } finally {
          setIsJoining(false);
        }
      } else if (!user && inviteCode) {
          setIsAuthModalOpen(true);
      }
    };
    handleAutoJoin();
  }, [user, inviteCode, navigate, setSearchParams]);

  // --- GESTIÓ DEL LOGIN AMB GOOGLE (CORREGIT) ---
  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    setAuthError('');
    try { 
      await signInWithPopup(auth, new GoogleAuthProvider());
      
      // ✅ CORRECCIÓ: Tanquem el modal explícitament un cop ha anat bé
      setIsAuthModalOpen(false);
      
    } catch (e: any) { 
      console.error(e); 
      setAuthError('Error iniciant sessió amb Google.');
    } finally { 
      setLoginLoading(false); 
    }
  };

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
        setAuthError("Error enviant el correu. Revisa que sigui correcte.");
    }
  };

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
      
      // ✅ CORRECCIÓ: Tanquem el modal també aquí
      setIsAuthModalOpen(false);

    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') setAuthError('Aquest correu ja està registrat.');
      else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') setAuthError('Dades incorrectes.');
      else if (error.code === 'auth/weak-password') setAuthError('La contrasenya és massa feble.');
      else setAuthError('Error: ' + error.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleJoinManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    if (user) {
        navigate(`/trip/${inputValue.trim()}`);
    } else {
        setSearchParams({ join: inputValue.trim() });
        setIsAuthModalOpen(true);
    }
  };

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

  const handleLeaveTrip = async (e: React.MouseEvent, tripId: string, internalUserId: string | undefined, tripName: string) => {
    e.stopPropagation();
    
    if (internalUserId) {
        if (!window.confirm(`Vols eliminar "${tripName}" de la teva llista?\n(Si tens despeses, quedaràs com a ex-membre)`)) return;
        try {
            await TripService.leaveTrip(tripId, internalUserId);
            setMyTrips(prev => prev.filter(t => t.id !== tripId));
        } catch (error) { console.error(error); alert("Error al sortir del grup."); }
    } else {
        if (!user) return;
        if (!window.confirm(`No trobem el teu perfil dins de "${tripName}", però tens accés.\nVols eliminar-lo de la teva llista igualment?`)) return;
        try {
            // @ts-ignore
            await TripService.removeMemberAccess(tripId, user.uid);
            setMyTrips(prev => prev.filter(t => t.id !== tripId));
        } catch (error) { console.error(error); alert("Error al forçar la sortida."); }
    }
  };

  const resetAction = () => { setActionState('idle'); setInputValue(''); setCreatorName(''); };
  const userName = user?.displayName ? user.displayName.split(' ')[0] : (user?.email?.split('@')[0] || 'Viatger');

  if (isJoining) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600"/></div>;

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
                
                {/* 1. NO LOGUEJAT */}
                {!user && (
                    <div className="flex flex-col gap-6 text-center py-4">
                        <p className="text-slate-600 font-medium text-lg leading-relaxed px-4">
                            L'eina definitiva per gestionar despeses de viatges i sortides en grup.
                        </p>
                        
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col gap-4">
                             <div className="text-left">
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1 block mb-2">Tens un codi d'invitació?</label>
                                <form onSubmit={handleJoinManual} className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Codi del grup..." 
                                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 font-mono text-slate-800 transition"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={!inputValue}
                                        className="bg-indigo-600 text-white px-5 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                    >
                                        <ArrowRight size={20}/>
                                    </button>
                                </form>
                             </div>
                             
                             <div className="relative flex py-1 items-center">
                                <div className="flex-grow border-t border-slate-200"></div>
                                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">o comença de zero</span>
                                <div className="flex-grow border-t border-slate-200"></div>
                             </div>

                             <button 
                                onClick={() => setIsAuthModalOpen(true)} 
                                className="w-full py-4 bg-white border-2 border-slate-100 text-slate-700 font-bold text-lg rounded-xl hover:border-indigo-200 hover:text-indigo-600 transition shadow-sm"
                             >
                                Iniciar Sessió / Registrar-se
                             </button>
                        </div>
                    </div>
                )}

                {/* 2. LOGUEJAT */}
                {user && (
                    <div className="flex flex-col h-full min-h-[400px]">
                        <div className="flex items-center justify-between mb-6 px-1">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Els teus grups</h3>
                            <button onClick={() => setActionState(actionState === 'creating' ? 'idle' : 'creating')} className="group flex items-center gap-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white pl-4 pr-3 py-2 rounded-full transition-all shadow-sm">
                                <span className="text-xs font-bold">NOU</span><div className="bg-white/20 rounded-full p-0.5"><Plus size={18} /></div>
                            </button>
                        </div>

                        {/* CREAR */}
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
                        
                        {/* UNIR-SE (LOGUEJAT) */}
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
                                    {myTrips.map(trip => {
                                        const currentUserInfo = trip.users.find(u => u.linkedUid === user.uid);
                                        return (
                                        <div key={trip.id} onClick={() => navigate(`/trip/${trip.id}`)} className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-indigo-200 cursor-pointer transition-all group">
                                            <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-bl-[4rem] -z-0 group-hover:scale-150 transition-transform duration-500 origin-top-right"></div>
                                            
                                            <button 
                                                onClick={(e) => handleLeaveTrip(e, trip.id, currentUserInfo?.id, trip.name)}
                                                className="absolute top-3 right-3 p-2 bg-slate-50 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-full transition-colors z-20 shadow-sm"
                                                title="Eliminar de la meva llista"
                                            >
                                                <Trash2 size={16} />
                                            </button>

                                            <div className="relative z-10 flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-xl group-hover:text-indigo-700 transition-colors mb-1">{trip.name}</h4>
                                                    <div className="flex items-center gap-3"><span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 flex items-center gap-1"><MapPin size={12} /> {trip.currency.code}</span><span className="text-xs text-slate-400 font-medium">{new Date(trip.createdAt).toLocaleDateString()}</span></div>
                                                </div>
                                                <div className="flex items-center gap-3 pr-8">
                                                    <div className="bg-slate-50 p-3 rounded-full text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm"><ChevronRight size={20} /></div>
                                                </div>
                                            </div>
                                        </div>
                                    )})}
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

      <Modal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} title={authMode === 'initial' || authMode === 'login-email' ? "Iniciar Sessió" : "Crear Compte"}>
        <div className="space-y-4">
            {authMode === 'initial' && (
                <>
                    <button onClick={handleGoogleLogin} disabled={loginLoading} className="w-full flex items-center justify-center gap-3 bg-[#1a1a1a] text-white hover:bg-black font-bold py-4 rounded-xl transition-all shadow-lg shadow-slate-200">
                        {loginLoading ? <Loader2 className="animate-spin text-white/50" /> : <><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" /> Continuar amb Google</>}
                    </button>
                    <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">O</span></div>
                    </div>
                    <button onClick={() => setAuthMode('login-email')} className="w-full py-3.5 bg-white border-2 border-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-2">
                        <Mail size={20} className="text-slate-400"/> Fer servir correu
                    </button>
                    <div className="text-center mt-2">
                        <p className="text-xs text-slate-400">En continuar, acceptes els nostres termes d'ús.</p>
                    </div>
                </>
            )}

            {(authMode === 'login-email' || authMode === 'signup-email') && (
                <form onSubmit={handleEmailAuth} className="flex flex-col gap-4 animate-fade-in">
                    {authError && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-medium border border-red-100">{authError}</div>}
                    {resetSent && <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-sm font-medium border border-emerald-100">Correu de recuperació enviat!</div>}

                    <div className="space-y-3">
                        <div className="relative">
                            <Mail className="absolute left-4 top-4 text-slate-400" size={20}/>
                            <input autoFocus type="email" placeholder="El teu correu" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-indigo-100 transition font-medium text-slate-700" value={email} onChange={e => setEmail(e.target.value)} required/>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-4 text-slate-400" size={20}/>
                            <input type={showPassword ? "text" : "password"} placeholder="Contrasenya" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-12 py-3.5 outline-none focus:ring-2 focus:ring-indigo-100 transition font-medium text-slate-700" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}/>
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                        </div>
                        {authMode === 'login-email' && (
                            <div className="flex justify-end"><button type="button" onClick={handleResetPassword} className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition">He oblidat la contrasenya</button></div>
                        )}
                        {authMode === 'signup-email' && (
                            <div className="relative animate-fade-in">
                                <Lock className="absolute left-4 top-4 text-slate-400" size={20}/>
                                <input type={showConfirmPassword ? "text" : "password"} placeholder="Repeteix la contrasenya" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-12 py-3.5 outline-none focus:ring-2 focus:ring-indigo-100 transition font-medium text-slate-700" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6}/>
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">{showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                            </div>
                        )}
                    </div>

                    <button disabled={loginLoading} className="mt-2 w-full bg-slate-800 text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition flex items-center justify-center gap-2 shadow-lg shadow-slate-200">
                        {loginLoading ? <Loader2 className="animate-spin" /> : (authMode === 'login-email' ? 'Entrar' : 'Registrar-me')}
                    </button>

                    <div className="flex flex-col gap-3 mt-2 text-center">
                        <button type="button" onClick={() => { setAuthMode(authMode === 'login-email' ? 'signup-email' : 'login-email'); setAuthError(''); setResetSent(false); }} className="text-indigo-600 font-bold hover:text-indigo-800 text-sm transition">
                            {authMode === 'login-email' ? "No tens compte? Registra't" : "Ja tens compte? Inicia sessió"}
                        </button>
                        <button type="button" onClick={() => { setAuthMode('initial'); setAuthError(''); }} className="text-slate-400 hover:text-slate-600 text-sm font-medium transition">← Tornar</button>
                    </div>
                </form>
            )}
        </div>
      </Modal>

      <style>{` .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } `}</style>
    </div>
  );
}