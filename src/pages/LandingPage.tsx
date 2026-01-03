import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Users, ArrowRight, Wallet, Loader2, LogOut, History, ChevronRight, MapPin, User as UserIcon, Trash2, Sparkles, KeyRound 
} from 'lucide-react';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';

import { db, appId, auth } from '../config/firebase';
import { CURRENCIES } from '../utils/constants';
import { TripData } from '../types';

interface LandingPageProps {
  user: User | null;
}

type ActionState = 'idle' | 'creating' | 'joining';

export default function LandingPage({ user }: LandingPageProps) {
  const navigate = useNavigate();
  const [myTrips, setMyTrips] = useState<TripData[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  
  const [actionState, setActionState] = useState<ActionState>('idle');
  const [inputValue, setInputValue] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [greeting, setGreeting] = useState('Hola');

  const lastTripId = localStorage.getItem('cc-last-trip-id');
  const isGuest = !user || user.isAnonymous;

  // 1. Salutació
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 13) setGreeting('Bon dia');
    else if (hour < 20) setGreeting('Bona tarda');
    else setGreeting('Bona nit');
  }, []);

  // 2. Pre-omplir nom
  useEffect(() => {
    if (actionState === 'creating' && user?.displayName) {
        setCreatorName(user.displayName.split(' ')[0]);
    }
  }, [actionState, user]);

  // 3. Càrrega de dades
  useEffect(() => {
    async function fetchMyTrips() {
      if (isGuest) return;
      setLoadingTrips(true);
      try {
        const tripsRef = collection(db, 'artifacts', appId, 'public', 'data', 'trips');
        const q = query(tripsRef, where('memberUids', 'array-contains', user!.uid));
        const snap = await getDocs(q);
        const trips: TripData[] = [];
        snap.forEach((d) => trips.push(d.data() as TripData));
        trips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setMyTrips(trips);
      } catch (e) { console.error(e); } finally { setLoadingTrips(false); }
    }
    fetchMyTrips();
  }, [user, isGuest]);

  const handleLogin = async () => {
    setLoginLoading(true);
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } 
    catch (e) { console.error(e); } 
    finally { setLoginLoading(false); }
  };

  const handleQuickAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    if (actionState === 'joining') {
        // Lògica per unir-se (serveix per a tots)
        navigate(`/trip/${inputValue}`);
    } else if (actionState === 'creating' && !isGuest) {
        // Lògica per crear (registrats)
        const finalName = creatorName.trim() || user?.displayName?.split(' ')[0] || 'Admin';
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
                memberUids: [user!.uid] 
            };
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${newId}`), newTrip);
            localStorage.setItem('cc-last-trip-id', newId);
            navigate(`/trip/${newId}`);
        } catch (error) { alert("Error creant el grup"); } finally { setIsSubmitting(false); }
    }
  };

  const handleLeaveTrip = async (tripId: string, tripName: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    const confirm = window.confirm(`Vols deixar de veure el grup "${tripName}"?`);
    if (!confirm || !user) return;

    try {
        const tripRef = doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`);
        await updateDoc(tripRef, { memberUids: arrayRemove(user.uid) });
        setMyTrips(prev => prev.filter(t => t.id !== tripId));
    } catch (error) { console.error(error); alert("Error al sortir."); }
  };

  const resetAction = () => { setActionState('idle'); setInputValue(''); setCreatorName(''); };
  const userName = user?.displayName ? user.displayName.split(' ')[0] : '';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-indigo-100">
      
      {/* FONS AMBIENTAL */}
      <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[50%] bg-indigo-200/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[100%] h-[50%] bg-purple-200/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-lg relative z-10 flex flex-col gap-6">
        
        {/* ENCAPÇALAMENT */}
        <div className="flex items-center justify-between px-2">
           <div>
             {!isGuest && (
                 <div className="flex items-center gap-2 mb-2">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
                        <Wallet size={20} strokeWidth={2.5} />
                    </div>
                    <span className="font-bold text-slate-600 tracking-tight text-sm uppercase">Comptes Clars</span>
                 </div>
             )}
             
             <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight tracking-tight">
               {!isGuest ? (
                 <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
                   {greeting}, {userName}.
                 </span>
               ) : (
                 <span className="flex items-center gap-3">
                    <span className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-200 block">
                        <Wallet size={32} strokeWidth={2.5} />
                    </span>
                    <span>Comptes Clars</span>
                 </span>
               )}
             </h1>
           </div>
           
           {!isGuest && (
             <button onClick={() => { signOut(auth); window.location.reload(); }} className="bg-white/80 backdrop-blur-sm p-3 rounded-2xl border border-white text-slate-400 hover:text-red-500 hover:scale-105 transition-all shadow-sm">
               <LogOut size={24} />
             </button>
           )}
        </div>

        {/* TARGETA PRINCIPAL */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl shadow-indigo-900/5 border border-white p-3 ring-1 ring-white/50">
            <div className="p-4 md:p-6">
                
                {/* 1. USUARI NO REGISTRAT */}
                {isGuest && (
                    <div className="flex flex-col gap-8">
                        <div>
                             <p className="text-center text-slate-600 font-medium mb-6 text-base">
                                Inicia sessió per crear i guardar els teus grups de forma segura.
                             </p>
                            <button 
                                onClick={handleLogin} 
                                disabled={loginLoading}
                                className="group w-full py-5 bg-[#1a1a1a] hover:bg-black text-white font-bold text-lg rounded-2xl shadow-xl shadow-slate-300/50 transition-all transform active:scale-[0.98] flex items-center justify-center gap-4 relative overflow-hidden"
                            >
                                {loginLoading ? <Loader2 className="animate-spin text-white/50" /> : (
                                    <>
                                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="G"/>
                                        <span className="tracking-wide">Entrar amb Google</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="border-t border-slate-200 pt-6">
                            {actionState === 'idle' ? (
                                <button onClick={() => setActionState('joining')} className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all group shadow-sm">
                                    <Users size={22} className="group-hover:scale-110 transition"/>
                                    <span className="text-base font-bold">Només vull unir-me a un grup</span>
                                </button>
                            ) : (
                                <div className="animate-fade-in bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Unir-se</label>
                                        <button type="button" onClick={resetAction} className="text-sm font-bold text-slate-500 hover:text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg">Tancar</button>
                                    </div>
                                    <form onSubmit={handleQuickAction} className="space-y-3">
                                        <input 
                                            autoFocus
                                            type="text" 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-lg font-bold text-slate-800 placeholder:font-normal text-center uppercase tracking-widest font-mono"
                                            placeholder="XXX-YYY"
                                            value={inputValue}
                                            onChange={e => setInputValue(e.target.value)}
                                        />
                                        <button 
                                            disabled={!inputValue || isSubmitting} 
                                            className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : <>Entrar <ArrowRight size={20}/></>}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. USUARI REGISTRAT */}
                {!isGuest && (
                    <div className="flex flex-col h-full min-h-[400px]">
                        <div className="flex items-center justify-between mb-6 px-1">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Els teus grups</h3>
                            {/* Botó per CREAR nou grup */}
                            <button onClick={() => setActionState(actionState === 'creating' ? 'idle' : 'creating')} className="group flex items-center gap-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white pl-4 pr-3 py-2 rounded-full transition-all shadow-sm">
                                <span className="text-xs font-bold">NOU</span>
                                <div className="bg-white/20 rounded-full p-0.5"><Plus size={18} /></div>
                            </button>
                        </div>

                        {/* Formulari de CREAR */}
                        {actionState === 'creating' && (
                            <form onSubmit={handleQuickAction} className="animate-fade-in mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-xs font-bold text-slate-400 uppercase ml-1">Nom del viatge</label>
                                            <button type="button" onClick={resetAction} className="text-xs font-bold text-slate-400 hover:text-slate-600">Cancel·lar</button>
                                        </div>
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
                        
                        {/* Formulari de UNIR-SE (NOVA SECCIÓ PER A REGISTRATS) */}
                        {actionState === 'joining' && (
                            <div className="animate-fade-in mb-6 bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm ring-4 ring-indigo-50">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-xs font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1"><KeyRound size={14}/> Codi d'invitació</label>
                                    <button type="button" onClick={resetAction} className="text-xs font-bold text-slate-400 hover:text-slate-600">Tancar</button>
                                </div>
                                <form onSubmit={handleQuickAction} className="flex gap-2">
                                    <input 
                                        autoFocus
                                        type="text" 
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-base font-bold text-slate-800 placeholder:font-normal uppercase tracking-widest font-mono"
                                        placeholder="XXX-YYY"
                                        value={inputValue}
                                        onChange={e => setInputValue(e.target.value)}
                                    />
                                    <button 
                                        disabled={!inputValue || isSubmitting} 
                                        className="bg-indigo-600 text-white px-5 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : <ArrowRight size={20}/>}
                                    </button>
                                </form>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar -mr-2">
                             {loadingTrips ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                                    <Loader2 className="animate-spin" size={32}/>
                                    <span className="text-sm font-medium">Carregant grups...</span>
                                </div>
                            ) : myTrips.length > 0 ? (
                                <div className="space-y-4 pb-4">
                                    {myTrips.map(trip => (
                                        <div key={trip.id} onClick={() => navigate(`/trip/${trip.id}`)} className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-indigo-200 cursor-pointer transition-all group">
                                            <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-bl-[4rem] -z-0 group-hover:scale-150 transition-transform duration-500 origin-top-right"></div>
                                            <div className="relative z-10 flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-xl group-hover:text-indigo-700 transition-colors mb-1">{trip.name}</h4>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 flex items-center gap-1">
                                                            <MapPin size={12} /> {trip.currency.code}
                                                        </span>
                                                        <span className="text-xs text-slate-400 font-medium">{new Date(trip.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-3">
                                                    <button 
                                                        onClick={(e) => handleLeaveTrip(trip.id, trip.name, e)}
                                                        className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                                        title="Ocultar de la llista"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                    <div className="bg-slate-50 p-3 rounded-full text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                                        <ChevronRight size={20} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
                                    <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                                        <Sparkles className="text-indigo-400" size={32} />
                                    </div>
                                    <p className="text-lg font-bold text-slate-600">Comencem?</p>
                                    <p className="text-sm text-slate-400 mt-2 max-w-[200px] leading-relaxed">Crea el teu primer grup amb el botó "Nou".</p>
                                </div>
                            )}
                        </div>

                        {/* PEU DE PÀGINA: ENLLAÇ PER UNIR-SE (Per a registrats) */}
                        {actionState === 'idle' && (
                             <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                                <button onClick={() => setActionState('joining')} className="text-sm font-bold text-slate-400 hover:text-indigo-600 transition flex items-center justify-center gap-2 w-full">
                                    <KeyRound size={16}/>
                                    Tens un codi d'invitació?
                                </button>
                             </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* TARGETA DE RECUPERACIÓ */}
        {lastTripId && isGuest && (
             <div 
               onClick={() => navigate(`/trip/${lastTripId}`)}
               className="mt-4 mx-2 bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white shadow-sm flex items-center gap-4 cursor-pointer hover:bg-white hover:shadow-md transition-all group"
             >
                <div className="bg-emerald-100/50 p-3 rounded-xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <History size={24} />
                </div>
                <div className="flex-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Detectat</p>
                    <p className="text-base font-bold text-slate-800">Recuperar sessió anterior</p>
                </div>
                <ChevronRight size={20} className="text-slate-400 group-hover:translate-x-1 transition-transform"/>
             </div>
        )}
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        @keyframes pulse-slow {
            0%, 100% { opacity: 0.2; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(1.05); }
        }
        .animate-pulse-slow { animation: pulse-slow 8s infinite ease-in-out; }
      `}</style>
    </div>
  );
}