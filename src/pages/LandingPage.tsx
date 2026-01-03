import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Users, ArrowRight, Wallet, Loader2, LogOut, History, ChevronRight, MapPin, User as UserIcon, Trash2 
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
  const [creatorName, setCreatorName] = useState(''); // Recuperem l'estat del nom
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

  // 2. Pre-omplir el nom quan obrim "Crear"
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
        navigate(`/trip/${inputValue}`);
    } else if (actionState === 'creating' && !isGuest) {
        // Validem que hi hagi nom
        const finalName = creatorName.trim() || user?.displayName?.split(' ')[0] || 'Admin';
        
        setIsSubmitting(true);
        try {
            const newId = Math.random().toString(36).substring(2, 9);
            const newTrip: TripData = { 
                id: newId, 
                name: inputValue, 
                users: [finalName], // Usem el nom personalitzat o el de Google
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

  // Funció per sortir del grup (RECUPERADA)
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-indigo-100">
      
      {/* FONS AMBIENTAL */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-300/20 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-300/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-[420px] relative z-10 flex flex-col gap-6">
        
        {/* ENCAPÇALAMENT */}
        <div className="flex items-center justify-between px-1">
           <div>
             {!isGuest && (
                 <div className="flex items-center gap-2 mb-2">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
                        <Wallet size={16} strokeWidth={2.5} />
                    </div>
                    <span className="font-bold text-slate-600 tracking-tight text-xs uppercase">Comptes Clars</span>
                 </div>
             )}
             
             <h1 className="text-4xl font-black text-slate-900 leading-tight tracking-tight">
               {!isGuest ? (
                 <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
                   {greeting}, {userName}.
                 </span>
               ) : (
                 <span className="flex items-center gap-3">
                    <span className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-2.5 rounded-2xl shadow-lg shadow-indigo-200 block">
                        <Wallet size={28} strokeWidth={2.5} />
                    </span>
                    <span>Comptes Clars</span>
                 </span>
               )}
             </h1>
           </div>
           
           {!isGuest && (
             <button onClick={() => { signOut(auth); window.location.reload(); }} className="bg-white/80 backdrop-blur-sm p-3 rounded-2xl border border-white text-slate-400 hover:text-red-500 hover:scale-105 transition-all shadow-sm">
               <LogOut size={18} />
             </button>
           )}
        </div>

        {/* BLOC PRINCIPAL */}
        <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-indigo-900/5 border border-white p-2 ring-1 ring-white/50">
            <div className="p-6">
                
                {/* 1. LOGIN OBLIGATORI (CONVIDAT) */}
                {isGuest && (
                    <div className="flex flex-col gap-8">
                        <div>
                             <p className="text-center text-slate-500 font-medium mb-4">
                                Inicia sessió per crear i guardar els teus grups de forma segura.
                             </p>
                            <button 
                                onClick={handleLogin} 
                                disabled={loginLoading}
                                className="group w-full py-4 bg-[#1a1a1a] hover:bg-black text-white font-bold rounded-2xl shadow-xl shadow-slate-300/50 transition-all transform active:scale-[0.97] flex items-center justify-center gap-3 relative overflow-hidden"
                            >
                                {loginLoading ? <Loader2 className="animate-spin text-white/50" /> : (
                                    <>
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G"/>
                                        <span className="tracking-wide">Entrar amb Google</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* SECCIÓ UNIR-SE */}
                        <div className="border-t border-slate-200 pt-6">
                            {actionState === 'idle' ? (
                                <button onClick={() => setActionState('joining')} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all group">
                                    <Users size={18} className="group-hover:scale-110 transition"/>
                                    <span className="text-sm font-bold">Només vull unir-me a un grup</span>
                                </button>
                            ) : (
                                <div className="animate-fade-in bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unir-se</label>
                                        <button type="button" onClick={resetAction} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 bg-slate-50 px-2 py-1 rounded-md">Tancar</button>
                                    </div>
                                    <form onSubmit={handleQuickAction} className="space-y-2">
                                        <input 
                                            autoFocus
                                            type="text" 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm font-bold text-slate-700 placeholder:font-normal text-center uppercase tracking-widest font-mono"
                                            placeholder="XXX-YYY"
                                            value={inputValue}
                                            onChange={e => setInputValue(e.target.value)}
                                        />
                                        <button 
                                            disabled={!inputValue || isSubmitting} 
                                            className="w-full mt-1 bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-black transition flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <>Entrar <ArrowRight size={16}/></>}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. USUARI REGISTRAT */}
                {!isGuest && (
                    <div className="flex flex-col h-full min-h-[300px]">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Els teus grups</h3>
                            <button onClick={() => setActionState(actionState === 'creating' ? 'idle' : 'creating')} className="group flex items-center gap-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white pl-3 pr-2 py-1.5 rounded-full transition-all">
                                <span className="text-[10px] font-bold">NOU</span>
                                <div className="bg-white/20 rounded-full p-0.5"><Plus size={14} /></div>
                            </button>
                        </div>

                        {actionState === 'creating' && (
                            <form onSubmit={handleQuickAction} className="animate-fade-in mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                                <div className="space-y-3">
                                    <input autoFocus type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 transition" placeholder="Nom del viatge (Ex: Menorca)" value={inputValue} onChange={e => setInputValue(e.target.value)}/>
                                    
                                    {/* --- CAMP RECUPERAT: NOM DEL PARTICIPANT --- */}
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                             <UserIcon size={16} className="absolute left-3 top-3 text-slate-400"/>
                                             <input type="text" className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 outline-none text-sm font-medium focus:ring-2 focus:ring-indigo-100 transition" placeholder="El teu nom al grup" value={creatorName} onChange={e => setCreatorName(e.target.value)}/>
                                        </div>
                                        <button disabled={!inputValue || !creatorName || isSubmitting} className="bg-indigo-600 text-white px-4 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition"><ArrowRight size={18}/></button>
                                    </div>
                                </div>
                            </form>
                        )}

                        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar -mr-2">
                             {loadingTrips ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                                    <Loader2 className="animate-spin" size={24}/>
                                    <span className="text-xs font-medium">Carregant...</span>
                                </div>
                            ) : myTrips.length > 0 ? (
                                <div className="space-y-3 pb-2">
                                    {myTrips.map(trip => (
                                        <div key={trip.id} onClick={() => navigate(`/trip/${trip.id}`)} className="relative overflow-hidden bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 cursor-pointer transition-all group">
                                            <div className="absolute right-0 top-0 w-16 h-16 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-bl-[3rem] -z-0 group-hover:scale-150 transition-transform duration-500 origin-top-right"></div>
                                            <div className="relative z-10 flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-lg group-hover:text-indigo-700 transition-colors">{trip.name}</h4>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 flex items-center gap-1">
                                                            <MapPin size={10} /> {trip.currency.code}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">{new Date(trip.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                
                                                {/* --- ICONA DE PAPERERA RECUPERADA --- */}
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={(e) => handleLeaveTrip(trip.id, trip.name, e)}
                                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                        title="Ocultar de la llista"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                    <div className="bg-slate-50 p-2.5 rounded-full text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                                        <ChevronRight size={18} />
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
                                    <Wallet className="text-indigo-300 mb-3" size={28} />
                                    <p className="text-sm font-bold text-slate-500">Comencem?</p>
                                    <p className="text-xs text-slate-400 mt-1 max-w-[150px]">Crea el teu primer grup amb el botó "Nou".</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* TARGETA DE RECUPERACIÓ */}
        {lastTripId && isGuest && (
             <div 
               onClick={() => navigate(`/trip/${lastTripId}`)}
               className="mt-6 mx-4 bg-white/60 backdrop-blur-md p-3 rounded-2xl border border-white shadow-sm flex items-center gap-3 cursor-pointer hover:bg-white hover:shadow-md transition-all group"
             >
                <div className="bg-emerald-100/50 p-2.5 rounded-xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <History size={18} />
                </div>
                <div className="flex-1">
                    <p className="text-xs font-bold text-slate-600 group-hover:text-slate-900">Recuperar sessió anterior</p>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform"/>
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