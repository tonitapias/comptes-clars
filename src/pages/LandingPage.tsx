import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, LogIn, Users, ArrowRight, Wallet, Loader2, LogOut, History, Sparkles 
} from 'lucide-react';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
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
  
  // Estats per a accions ràpides
  const [actionState, setActionState] = useState<ActionState>('idle');
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lastTripId = localStorage.getItem('cc-last-trip-id');

  // --- Càrrega de dades ---
  useEffect(() => {
    async function fetchMyTrips() {
      if (!user || user.isAnonymous) return;
      setLoadingTrips(true);
      try {
        const tripsRef = collection(db, 'artifacts', appId, 'public', 'data', 'trips');
        const q = query(tripsRef, where('memberUids', 'array-contains', user.uid));
        const snap = await getDocs(q);
        const trips: TripData[] = [];
        snap.forEach((d) => trips.push(d.data() as TripData));
        trips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setMyTrips(trips);
      } catch (e) { console.error(e); } finally { setLoadingTrips(false); }
    }
    fetchMyTrips();
  }, [user]);

  // --- Handlers ---
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
        // Unir-se a un grup
        navigate(`/trip/${inputValue}`);
    } else if (actionState === 'creating') {
        // Crear nou grup
        setIsSubmitting(true);
        try {
            const newId = Math.random().toString(36).substring(2, 9);
            const creatorName = user?.displayName || 'Admin';
            const newTrip: TripData = { 
                id: newId, name: inputValue, users: [creatorName], expenses: [], 
                currency: CURRENCIES[0], createdAt: new Date().toISOString(), 
                memberUids: user ? [user.uid] : [] 
            };
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${newId}`), newTrip);
            localStorage.setItem('cc-last-trip-id', newId);
            navigate(`/trip/${newId}`);
        } catch (error) { alert("Error creant el grup"); } finally { setIsSubmitting(false); }
    }
  };

  const resetAction = () => {
      setActionState('idle');
      setInputValue('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Fons decoratiu subtil */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-indigo-50 to-slate-50 -z-10"></div>

      <div className="w-full max-w-md">
        
        {/* ENCAPÇALAMENT: Friendly & Clean */}
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm mb-4">
                <Wallet className="text-indigo-600" size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Comptes Clars</h1>
            <p className="text-slate-500 font-medium">Divideix despeses, multiplica moments.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden relative">
            
            {/* BARRA SUPERIOR (User Logged In) */}
            {user && !user.isAnonymous && (
                <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {user.photoURL ? <img src={user.photoURL} className="w-6 h-6 rounded-full" alt=""/> : <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600">{user.displayName?.[0]}</div>}
                        <span className="text-sm font-bold text-slate-600">{user.displayName?.split(' ')[0]}</span>
                    </div>
                    <button onClick={() => { signOut(auth); window.location.reload(); }} className="text-xs font-bold text-slate-400 hover:text-red-500 transition flex items-center gap-1">
                        <LogOut size={12}/> Sortir
                    </button>
                </div>
            )}

            <div className="p-6 md:p-8">
                
                {/* 1. ESTAT: NO REGISTRAT */}
                {(!user || user.isAnonymous) && (
                    <div className="space-y-6">
                        {/* Botó Principal */}
                        <button 
                            onClick={handleLogin} 
                            disabled={loginLoading}
                            className="w-full py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-lg shadow-slate-200 transition-all transform active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                            {loginLoading ? <Loader2 className="animate-spin text-white" /> : (
                                <>
                                 <div className="bg-white p-1 rounded-full"><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="G"/></div>
                                 <span>Entrar amb Google</span>
                                </>
                            )}
                        </button>

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-slate-100"></div>
                            <span className="flex-shrink-0 mx-4 text-xs font-bold text-slate-300 uppercase tracking-widest">Opció ràpida</span>
                            <div className="flex-grow border-t border-slate-100"></div>
                        </div>

                        {/* Selector d'Accions */}
                        {actionState === 'idle' ? (
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setActionState('creating')} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-slate-50 bg-slate-50 hover:border-indigo-100 hover:bg-indigo-50 transition-all group">
                                    <Plus className="text-indigo-500 group-hover:scale-110 transition" size={24} />
                                    <span className="text-sm font-bold text-slate-600">Nou Grup</span>
                                </button>
                                <button onClick={() => setActionState('joining')} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-slate-50 bg-slate-50 hover:border-emerald-100 hover:bg-emerald-50 transition-all group">
                                    <Users className="text-emerald-500 group-hover:scale-110 transition" size={24} />
                                    <span className="text-sm font-bold text-slate-600">Tinc Codi</span>
                                </button>
                            </div>
                        ) : (
                            /* Formulari Inline */
                            <form onSubmit={handleQuickAction} className="animate-fade-in bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">{actionState === 'creating' ? 'Nom del viatge' : 'Codi del grup'}</label>
                                    <button type="button" onClick={resetAction} className="text-xs font-bold text-slate-400 hover:text-slate-600">✕ Cancel·lar</button>
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        autoFocus
                                        type="text" 
                                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition font-medium"
                                        placeholder={actionState === 'creating' ? "Ex: Menorca '24" : "Ex: 123-abc"}
                                        value={inputValue}
                                        onChange={e => setInputValue(e.target.value)}
                                    />
                                    <button disabled={!inputValue || isSubmitting} className="bg-indigo-600 text-white w-10 rounded-xl flex items-center justify-center hover:bg-indigo-700 transition disabled:opacity-50">
                                        {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <ArrowRight size={18}/>}
                                    </button>
                                </div>
                            </form>
                        )}
                        
                        {/* Link de recuperació */}
                        {lastTripId && actionState === 'idle' && (
                             <div className="text-center pt-2">
                                <button onClick={() => navigate(`/trip/${lastTripId}`)} className="text-xs font-medium text-indigo-600 hover:underline flex items-center justify-center gap-1.5 w-full opacity-80 hover:opacity-100 transition">
                                    <History size={12}/> Recuperar l'últim grup visitat
                                </button>
                             </div>
                        )}
                    </div>
                )}

                {/* 2. ESTAT: REGISTRAT (Llista de Viatges) */}
                {user && !user.isAnonymous && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Els teus grups</h3>
                            <button onClick={() => setActionState(actionState === 'creating' ? 'idle' : 'creating')} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition">
                                <Plus size={20} />
                            </button>
                        </div>

                        {/* Formulari de creació ràpida per a usuaris */}
                        {actionState === 'creating' && (
                            <form onSubmit={handleQuickAction} className="animate-fade-in flex gap-2 mb-4">
                                <input autoFocus type="text" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none text-sm" placeholder="Nom del nou grup..." value={inputValue} onChange={e => setInputValue(e.target.value)}/>
                                <button disabled={!inputValue || isSubmitting} className="bg-indigo-600 text-white px-3 rounded-xl shadow-sm"><ArrowRight size={16}/></button>
                            </form>
                        )}

                        {loadingTrips ? (
                            <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-indigo-200" size={24}/></div>
                        ) : myTrips.length > 0 ? (
                            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                                {myTrips.map(trip => (
                                    <div key={trip.id} onClick={() => navigate(`/trip/${trip.id}`)} className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-xl hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-100/50 cursor-pointer transition-all group">
                                        <div>
                                            <p className="font-bold text-slate-700 group-hover:text-indigo-700 transition">{trip.name}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{new Date(trip.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-400 transition transform group-hover:translate-x-1"/>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                <Sparkles className="mx-auto text-indigo-300 mb-2" size={24} />
                                <p className="text-sm text-slate-500 font-medium">Tot net!</p>
                                <p className="text-xs text-slate-400">Crea el teu primer grup per començar.</p>
                            </div>
                        )}
                        
                        <div className="pt-4 border-t border-slate-50 flex justify-center">
                             <button onClick={() => setActionState(actionState === 'joining' ? 'idle' : 'joining')} className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition">
                                {actionState === 'joining' ? 'Tancar' : 'Tens un codi d\'invitació?'}
                             </button>
                        </div>
                        {actionState === 'joining' && (
                            <form onSubmit={handleQuickAction} className="mt-2 flex gap-2 animate-fade-in">
                                <input autoFocus type="text" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none text-sm text-center uppercase tracking-widest font-mono" placeholder="XXX-YYY" value={inputValue} onChange={e => setInputValue(e.target.value)}/>
                                <button disabled={inputValue.length < 3} className="bg-slate-800 text-white px-3 rounded-lg"><ArrowRight size={14}/></button>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #f1f5f9; border-radius: 4px; }`}</style>
    </div>
  );
}