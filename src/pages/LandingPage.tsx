import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Plus, ArrowRight, Wallet, Loader2, LogOut, ChevronRight, MapPin, 
  User as UserIcon, Trash2, Sparkles, KeyRound, Mail, Lock, Eye, EyeOff, 
  CreditCard, PieChart, ShieldCheck, FolderGit2 
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
import { TripData, TripUser } from '../types'; 
import Modal from '../components/Modal';

interface LandingPageProps {
  user: User | null;
}

type ActionState = 'idle' | 'creating' | 'joining';
type AuthMode = 'initial' | 'login-email' | 'signup-email';

function BentoCard({ icon: Icon, title, desc, color }: any) {
    return (
      <div className="group relative overflow-hidden bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-3xl border border-white/50 dark:border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        <div className={`absolute top-0 right-0 p-20 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20 ${color}`}></div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-sm ${color} text-white`}>
          <Icon size={24} strokeWidth={2.5} />
        </div>
        <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-2">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{desc}</p>
      </div>
    );
}

export default function LandingPage({ user }: LandingPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const inviteCode = searchParams.get('join');
  
  // Estats
  const [myTrips, setMyTrips] = useState<TripData[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [actionState, setActionState] = useState<ActionState>('idle');
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('initial');
  const [loginLoading, setLoginLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [inputValue, setInputValue] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [greeting, setGreeting] = useState('Hola');
  const [isJoining, setIsJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- LÒGICA DE SALUTACIÓ ---
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 14) setGreeting('Bon dia');
    else if (hour >= 14 && hour < 21) setGreeting('Bona tarda');
    else setGreeting('Bona nit');
  }, []);

  useEffect(() => {
    if (actionState === 'creating' && user?.displayName) {
        setCreatorName(user.displayName.split(' ')[0]);
    }
  }, [actionState, user]);

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

  useEffect(() => {
    const handleAutoJoin = async () => {
      if (user && inviteCode) {
        setIsJoining(true);
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

  // --- HANDLERS ---
 // A src/pages/LandingPage.tsx

const handleGoogleLogin = async () => {
    setLoginLoading(true);
    setAuthError('');
    try { 
      await signInWithPopup(auth, new GoogleAuthProvider());
      setIsAuthModalOpen(false);
    } catch (e: any) { 
      // Si hi ha un error però l'usuari s'ha creat/loguejat igualment (cas típic de COOP), ho donem per bo.
      if (auth.currentUser) {
          console.warn("Avís de tancament de popup ignorat (l'usuari està loguejat).");
          setIsAuthModalOpen(false);
          return;
      }

      console.error(e); 
      
      // Filtrem missatges tècnics lletjos per a l'usuari
      if (e.message && e.message.includes('closed-by-user')) {
        setAuthError('Has tancat la finestra abans d\'acabar.');
      } else {
        setAuthError('Error iniciant sessió amb Google. Prova-ho de nou.');
      }
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
        setIsSubmitting(true);
        try {
            if (user) {
                await TripService.joinTripViaLink(inputValue.trim(), user);
                navigate(`/trip/${inputValue.trim()}`);
            }
        } catch (error) {
            console.error(error);
            alert("Error: No s'ha pogut trobar el grup o unir-s'hi. Revisa el codi.");
        } finally {
            setIsSubmitting(false);
        }

    } else if (actionState === 'creating' && user) {
        const defaultName = user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Admin';
        const finalName = creatorName.trim() || defaultName;
        
        setIsSubmitting(true);
        try {
            const newId = Math.random().toString(36).substring(2, 9);
            
            // CORRECCIÓ: Objecte net sense undefineds
            const newTripUser: TripUser = {
                id: crypto.randomUUID(),
                name: finalName,
                isAuth: true,
                linkedUid: user.uid,
                isDeleted: false,
                ...(user.email ? { email: user.email } : {}),
                ...(user.photoURL ? { photoUrl: user.photoURL } : {})
            };

            const newTrip: TripData = { 
                id: newId, 
                name: inputValue, 
                users: [newTripUser],
                expenses: [], 
                currency: CURRENCIES[0], 
                createdAt: new Date().toISOString(), 
                memberUids: [user.uid] 
            };
            
            await TripService.createTrip(newTrip);
            navigate(`/trip/${newId}`);
        } catch (error) { 
            console.error(error);
            alert("Error creant el grup"); 
        } finally { 
            setIsSubmitting(false); 
        }
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
  const userName = user?.displayName ? user.displayName.split(' ')[0] : (user?.email?.split('@')[0] || 'Usuari');

  if (isJoining) return <div className="min-h-screen flex items-center justify-center bg-indigo-50 dark:bg-slate-950"><Loader2 className="animate-spin text-indigo-600 w-10 h-10"/></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col items-center p-4 md:p-8 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900 relative overflow-x-hidden transition-colors duration-300">
      
      {/* FONS ANIMAT */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-purple-200/40 dark:bg-purple-900/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse-slow"></div>
         <div className="absolute top-[20%] right-[-10%] w-[60%] h-[60%] bg-indigo-200/40 dark:bg-indigo-900/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse-slow" style={{animationDelay: '2s'}}></div>
         <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] bg-pink-200/40 dark:bg-pink-900/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse-slow" style={{animationDelay: '4s'}}></div>
         <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 dark:opacity-10"></div>
      </div>

      <div className="w-full max-w-6xl relative z-10 flex flex-col gap-8 h-full">
        
        {/* NAVBAR */}
        <nav className="flex items-center justify-between py-4">
           <div className="flex items-center gap-3">
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-2.5 rounded-2xl shadow-sm border border-white/50 dark:border-white/10">
                <Wallet size={24} className="text-indigo-600 dark:text-indigo-400" strokeWidth={2.5} />
              </div>
              <span className="font-extrabold text-xl text-slate-800 dark:text-white tracking-tight hidden md:block">Comptes Clars</span>
           </div>
           
           {user ? (
             <div className="flex items-center gap-3 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md px-2 py-1.5 rounded-full border border-white/50 dark:border-white/10 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 p-0.5">
                    <img 
                      src={user.photoURL || `https://ui-avatars.com/api/?name=${userName}`} 
                      className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-800" 
                      alt="Avatar"
                      referrerPolicy="no-referrer"
                    />
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 pr-2 hidden sm:block">{userName}</span>
                <button onClick={() => { signOut(auth); window.location.reload(); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-red-50 dark:bg-slate-700 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Tancar Sessió">
                    <LogOut size={16} strokeWidth={2.5}/>
                </button>
             </div>
           ) : (
             <button onClick={() => setIsAuthModalOpen(true)} className="px-5 py-2.5 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl shadow-sm hover:shadow-md transition-all text-sm border border-white/50 dark:border-white/10">
                Iniciar Sessió
             </button>
           )}
        </nav>

        <main className="flex-1 flex flex-col justify-center">
            
            {/* 1. ESTAT NO LOGUEJAT (Landing Visual) */}
            {!user && (
                <div className="flex flex-col items-center text-center gap-10 py-10 md:py-20 animate-fade-in">
                    
                    <div className="max-w-3xl space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 text-xs font-bold uppercase tracking-wider mb-4 animate-fade-in">
                            <Sparkles size={14}/> Gestió de despeses en grup
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight">
                            Divideix despeses,<br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">multiplica vivències.</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                            L'eina definitiva per gestionar els comptes de projectes, viatges i esdeveniments. Sense excels complicats, tot clar.
                        </p>
                    </div>

                    {/* TARGETA INPUT PRINCIPAL */}
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 p-2 rounded-3xl shadow-2xl shadow-indigo-200/50 dark:shadow-indigo-900/20 border border-indigo-50 dark:border-slate-800 transform hover:scale-[1.01] transition-transform">
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
                             <form onSubmit={handleJoinManual} className="flex gap-2 mb-4">
                                <input 
                                    type="text" 
                                    placeholder="Tens un codi? Enganxa'l aquí..." 
                                    className="flex-1 px-4 py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-600 focus:border-indigo-500 focus:outline-none bg-white dark:bg-slate-900 font-mono text-slate-800 dark:text-white transition"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                />
                                <button 
                                    type="submit" 
                                    disabled={!inputValue}
                                    className="bg-indigo-600 text-white px-5 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center"
                                >
                                    <ArrowRight size={24}/>
                                </button>
                             </form>

                             <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-slate-200 dark:border-slate-600"></div>
                                <span className="flex-shrink-0 mx-4 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">o crea el teu projecte</span>
                                <div className="flex-grow border-t border-slate-200 dark:border-slate-600"></div>
                             </div>

                             <button 
                                onClick={() => setIsAuthModalOpen(true)} 
                                className="w-full mt-2 py-4 bg-slate-900 dark:bg-indigo-600 text-white font-bold text-lg rounded-xl hover:bg-black dark:hover:bg-indigo-500 transition shadow-lg flex items-center justify-center gap-2 group"
                             >
                                Començar Gratis <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                             </button>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 w-full max-w-5xl mt-8">
                        <BentoCard icon={CreditCard} title="Comptes Clars" desc="Afegeix despeses en segons. Reparteix a parts iguals o personalitzades." color="bg-blue-500"/>
                        <BentoCard icon={PieChart} title="Temps Real" desc="Tothom veu el mateix. Sincronització instantània sense conflictes." color="bg-indigo-500"/>
                        <BentoCard icon={ShieldCheck} title="Liquidació Fàcil" desc="L'algoritme calcula els mínims pagaments per saldar el deute." color="bg-teal-500"/>
                    </div>
                </div>
            )}

            {/* 2. ESTAT LOGUEJAT (Dashboard Modern) */}
            {user && (
                <div className="w-full max-w-5xl mx-auto py-6 animate-fade-in">
                    
                    {/* Header Dashboard */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white mb-1">{greeting}, <span className="text-indigo-600 dark:text-indigo-400">{userName}.</span></h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Aquí tens els teus projectes actius.</p>
                        </div>
                        <div className="flex gap-2">
                             {actionState === 'idle' ? (
                                <button onClick={() => setActionState('creating')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:-translate-y-1 flex items-center gap-2">
                                    <Plus size={20} /> Nou Projecte
                                </button>
                             ) : (
                                <button onClick={resetAction} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 px-6 py-3 rounded-2xl font-bold border border-slate-200 dark:border-slate-700 transition-all">
                                    Cancel·lar
                                </button>
                             )}
                             
                             {actionState === 'idle' && (
                                <button onClick={() => setActionState('joining')} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 px-6 py-3 rounded-2xl font-bold border border-indigo-100 dark:border-indigo-900/50 shadow-sm transition-all flex items-center gap-2">
                                    <KeyRound size={20} /> Tinc codi
                                </button>
                             )}
                        </div>
                    </div>

                    {/* ZONA D'ACCIONS RÀPIDES */}
                    {(actionState === 'creating' || actionState === 'joining') && (
                        <div className="mb-8 animate-fade-in">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl shadow-indigo-100/50 dark:shadow-none border border-indigo-50 dark:border-indigo-900/50 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                    {actionState === 'creating' ? <><FolderGit2 size={20} className="text-indigo-500"/> Crear nou projecte</> : <><KeyRound size={20} className="text-indigo-500"/> Unir-se a un grup</>}
                                </h3>
                                
                                <form onSubmit={handleQuickAction} className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1 space-y-3">
                                        <label className="text-xs font-bold text-slate-400 uppercase ml-1">
                                            {actionState === 'creating' ? 'Nom del projecte' : 'Codi d\'invitació'}
                                        </label>
                                        <input 
                                            autoFocus type="text" 
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-lg font-bold text-slate-800 dark:text-white transition placeholder:text-slate-300 dark:placeholder:text-slate-600" 
                                            placeholder={actionState === 'creating' ? "Ex: Sopar Estiu 2025" : "XXX-YYY-ZZZ"} 
                                            value={inputValue} 
                                            onChange={e => setInputValue(e.target.value)}
                                        />
                                    </div>
                                    
                                    {actionState === 'creating' && (
                                        <div className="flex-1 space-y-3">
                                            <label className="text-xs font-bold text-slate-400 uppercase ml-1">El teu àlies</label>
                                            <input 
                                                type="text" 
                                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-lg font-bold text-slate-800 dark:text-white transition" 
                                                value={creatorName} 
                                                onChange={e => setCreatorName(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    <div className="flex items-end">
                                        <button disabled={!inputValue || (actionState === 'creating' && !creatorName) || isSubmitting} className="h-[54px] px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition disabled:opacity-50 flex items-center gap-2">
                                            {isSubmitting ? <Loader2 className="animate-spin"/> : <ArrowRight size={24}/>}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* GRID DE PROJECTES */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {loadingTrips ? (
                            [1,2,3].map(i => <div key={i} className="h-40 bg-white/50 dark:bg-slate-800/50 animate-pulse rounded-3xl"></div>)
                        ) : myTrips.length > 0 ? (
                            myTrips.map(trip => {
                                const currentUserInfo = trip.users.find(u => u.linkedUid === user.uid);
                                return (
                                <div 
                                    key={trip.id} 
                                    onClick={() => navigate(`/trip/${trip.id}`)} 
                                    className="group relative bg-white dark:bg-slate-900 hover:bg-white/80 dark:hover:bg-slate-800 p-6 rounded-3xl border border-white/60 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 overflow-hidden"
                                >
                                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-2.5 rounded-xl">
                                                <FolderGit2 size={24} />
                                            </div>
                                            
                                            <button 
                                                onClick={(e) => handleLeaveTrip(e, trip.id, currentUserInfo?.id, trip.name)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 z-20"
                                                title="Treure de la llista"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                        
                                        <h3 className="text-xl font-extrabold text-slate-800 dark:text-white mb-1 truncate pr-2">{trip.name}</h3>
                                        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mb-4">Creat el {new Date(trip.createdAt).toLocaleDateString()}</p>
                                        
                                        <div className="flex items-center justify-between mt-auto">
                                            <div className="flex -space-x-2">
                                                {trip.users.slice(0, 3).map((u, i) => (
                                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400 overflow-hidden shadow-sm">
                                                        {/* SOLUCIÓ APLICADA AQUÍ (TRIP CARDS) */}
                                                        {u.photoUrl ? <img src={u.photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer"/> : u.name[0]}
                                                    </div>
                                                ))}
                                                {trip.users.length > 3 && <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm">+{trip.users.length - 3}</div>}
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                <ChevronRight size={18} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )})
                        ) : (
                            <div className="col-span-full py-16 text-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-300 dark:text-indigo-400">
                                    <Sparkles size={40} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-700 dark:text-white">Tot a punt per començar!</h3>
                                <p className="text-slate-400 mt-2">Crea el teu primer projecte amb el botó "Nou Projecte".</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
      </div>

      {/* MODAL D'AUTENTICACIÓ */}
      <Modal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} title={authMode === 'initial' || authMode === 'login-email' ? "Benvingut/da" : "Crear Compte"}>
        <div className="space-y-4 px-2">
            
            {authMode === 'initial' && (
                <>
                    <button onClick={handleGoogleLogin} disabled={loginLoading} className="w-full flex items-center justify-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-200 font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl transform active:scale-[0.98]">
                        {loginLoading ? <Loader2 className="animate-spin text-white/50" /> : <><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" /> Continuar amb Google</>}
                    </button>
                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-700"></div></div>
                        <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest"><span className="bg-white dark:bg-slate-900 px-2 text-slate-300 dark:text-slate-600">OPCIONS</span></div>
                    </div>
                    <button onClick={() => setAuthMode('login-email')} className="w-full py-3.5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-white font-bold rounded-xl hover:border-indigo-200 hover:text-indigo-600 transition flex items-center justify-center gap-2">
                        <Mail size={20}/> Fer servir correu
                    </button>
                </>
            )}

            {(authMode === 'login-email' || authMode === 'signup-email') && (
                <form onSubmit={handleEmailAuth} className="flex flex-col gap-4 animate-fade-in">
                    {authError && <div className="bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-300 p-3 rounded-xl text-sm font-bold border border-red-100 dark:border-red-900/50">{authError}</div>}
                    {resetSent && <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl text-sm font-bold border border-emerald-100 dark:border-emerald-900/50">Revisa el teu correu!</div>}

                    <div className="space-y-3">
                        <div className="relative group">
                            <Mail className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20}/>
                            <input autoFocus type="email" placeholder="El teu correu" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3.5 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition font-bold text-slate-700 dark:text-white" value={email} onChange={e => setEmail(e.target.value)} required/>
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20}/>
                            <input type={showPassword ? "text" : "password"} placeholder="Contrasenya" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-12 pr-12 py-3.5 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition font-bold text-slate-700 dark:text-white" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}/>
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-slate-300 hover:text-indigo-600">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                        </div>
                        
                        {authMode === 'login-email' && (
                            <div className="flex justify-end"><button type="button" onClick={handleResetPassword} className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition">He oblidat la contrasenya</button></div>
                        )}
                        
                        {authMode === 'signup-email' && (
                            <div className="relative group animate-fade-in">
                                <Lock className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20}/>
                                <input type={showConfirmPassword ? "text" : "password"} placeholder="Repeteix la contrasenya" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-12 pr-12 py-3.5 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition font-bold text-slate-700 dark:text-white" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6}/>
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-4 text-slate-300 hover:text-indigo-600">{showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                            </div>
                        )}
                    </div>

                    <button disabled={loginLoading} className="mt-2 w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none">
                        {loginLoading ? <Loader2 className="animate-spin" /> : (authMode === 'login-email' ? 'Entrar' : 'Registrar-me')}
                    </button>

                    <div className="flex flex-col gap-3 mt-2 text-center">
                        <button type="button" onClick={() => { setAuthMode(authMode === 'login-email' ? 'signup-email' : 'login-email'); setAuthError(''); setResetSent(false); }} className="text-slate-600 dark:text-slate-300 font-bold hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition">
                            {authMode === 'login-email' ? "No tens compte? Registra't gratis" : "Ja tens compte? Inicia sessió"}
                        </button>
                        <button type="button" onClick={() => { setAuthMode('initial'); setAuthError(''); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold uppercase tracking-wider transition">Tornar enrere</button>
                    </div>
                </form>
            )}
        </div>
      </Modal>

      <style>{` 
        .custom-scrollbar::-webkit-scrollbar { width: 4px; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; } 
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } 
        @keyframes pulse-slow { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.1); } }
        .animate-pulse-slow { animation: pulse-slow 8s infinite ease-in-out; }
      `}</style>
    </div>
  );
}