// src/pages/LandingPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Plus, ArrowRight, Wallet, Loader2, LogOut, ChevronRight, 
  Sparkles, KeyRound, CreditCard, PieChart, ShieldCheck, FolderGit2 
} from 'lucide-react';
import { signOut, User } from 'firebase/auth';

import { auth } from '../config/firebase';
import { TripService } from '../services/tripService';
import { CURRENCIES } from '../utils/constants';
import { TripData, TripUser } from '../types'; 
import Modal from '../components/Modal';

// Components nous refactoritzats
import BentoCard from '../components/landing/BentoCard';
import TripCard from '../components/landing/TripCard';
import AuthForm from '../components/auth/AuthForm';

// --- TIPUS ---
type ActionState = 'idle' | 'creating' | 'joining';

interface LandingPageProps {
  user: User | null;
}

export default function LandingPage({ user }: LandingPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const inviteCode = searchParams.get('join');
  
  const [myTrips, setMyTrips] = useState<TripData[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [actionState, setActionState] = useState<ActionState>('idle');
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [inputValue, setInputValue] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [greeting, setGreeting] = useState('Hola');
  const [isJoining, setIsJoining] = useState(false);

  // Lògica de salutació
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

  // Recuperació de viatges
  useEffect(() => {
    async function fetchMyTrips() {
      if (!user) {
          setMyTrips([]);
          return;
      }
      setLoadingTrips(true);
      try {
        const trips = await TripService.getUserTrips(user.uid);
        trips.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });
        setMyTrips(trips);
      } catch (e) { 
          console.error("Error carregant viatges:", e); 
      } finally { 
          setLoadingTrips(false); 
      }
    }
    fetchMyTrips();
  }, [user]);

  // Unió automàtica via link
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
          console.error("Error en auto-join:", error);
        } finally {
          setIsJoining(false);
        }
      } else if (!user && inviteCode) {
          setIsAuthModalOpen(true);
      }
    };
    handleAutoJoin();
  }, [user, inviteCode, navigate, setSearchParams]);

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

    if (actionState === 'joining' && user) {
        setIsSubmitting(true);
        try {
            await TripService.joinTripViaLink(inputValue.trim(), user);
            navigate(`/trip/${inputValue.trim()}`);
        } catch (err) { alert("Codi invàlid"); } finally { setIsSubmitting(false); }
    } else if (actionState === 'creating' && user) {
        setIsSubmitting(true);
        try {
            const newId = Math.random().toString(36).substring(2, 9);
            
            // CONSTRUCCIÓ SEGURA DE L'USUARI
            const newTripUser: TripUser = {
                id: crypto.randomUUID(),
                name: creatorName.trim() || user.displayName?.split(' ')[0] || 'Admin',
                isAuth: true,
                linkedUid: user.uid,
                isDeleted: false,
                email: user.email || undefined,
                photoUrl: user.photoURL || null
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
        } catch (err) { 
            console.error(err);
            alert("Error creant el projecte"); 
        } finally { setIsSubmitting(false); }
    }
  };

  const handleLeaveTrip = async (e: React.MouseEvent, tripId: string, internalUserId: string | undefined, tripName: string) => {
    e.stopPropagation();
    if (!window.confirm(`Vols eliminar "${tripName}" de la llista?`)) return;
    
    try {
        if (internalUserId) {
            await TripService.leaveTrip(tripId, internalUserId);
        }
        setMyTrips(prev => prev.filter(t => t.id !== tripId));
    } catch (err) { 
        console.error("Error al sortir:", err);
        alert("Error al sortir del grup"); 
    }
  };

  const userName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuari';

  if (isJoining) return <div className="min-h-screen flex items-center justify-center bg-indigo-50 dark:bg-slate-950"><Loader2 className="animate-spin text-indigo-600 w-10 h-10"/></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col items-center p-4 md:p-8 font-sans transition-colors duration-300 relative overflow-x-hidden">
      
      {/* BACKGROUND EFFECTS (OPTIMITZAT GPU) */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-purple-200/40 dark:bg-purple-900/20 rounded-full blur-[100px] animate-pulse-slow transform-gpu will-change-transform"></div>
         <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] bg-pink-200/40 dark:bg-pink-900/20 rounded-full blur-[100px] animate-pulse-slow transform-gpu will-change-transform" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="w-full max-w-6xl relative z-10 flex flex-col gap-8 h-full">
        
        {/* NAVBAR */}
        <nav className="flex items-center justify-between py-4">
           <div className="flex items-center gap-3">
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-2.5 rounded-2xl shadow-sm border border-white/50 dark:border-white/10">
                <Wallet size={24} className="text-indigo-600 dark:text-indigo-400" strokeWidth={2.5} />
              </div>
              <span className="font-extrabold text-xl text-slate-800 dark:text-white hidden md:block tracking-tight">Comptes Clars</span>
           </div>
           
           {user ? (
             <div className="flex items-center gap-3 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md px-2 py-1.5 rounded-full border border-white/50 dark:border-white/10 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 p-0.5">
                    <img src={user.photoURL || `https://ui-avatars.com/api/?name=${userName}`} className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-800" alt="Avatar" referrerPolicy="no-referrer" />
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 pr-2 hidden sm:block">{userName}</span>
                <button onClick={() => { signOut(auth).then(() => window.location.reload()); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-red-50 dark:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors">
                    <LogOut size={16} strokeWidth={2.5}/>
                </button>
             </div>
           ) : (
             <button onClick={() => setIsAuthModalOpen(true)} className="px-5 py-2.5 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl shadow-sm border border-white/50 dark:border-white/10 text-sm hover:scale-105 transition-transform active:scale-95">
                Iniciar Sessió
             </button>
           )}
        </nav>

        <main className="flex-1 flex flex-col justify-center">
            
            {/* 1. LANDING VISUAL (NO USER) */}
            {!user ? (
                <div className="flex flex-col items-center text-center gap-10 py-10 md:py-20 animate-fade-in">
                    <div className="max-w-3xl space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50/80 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 text-xs font-bold uppercase tracking-wider mb-4 backdrop-blur-sm shadow-sm">
                            <Sparkles size={14}/> Gestió de despeses en grup
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white leading-[1.05] tracking-tight">
                            Divideix despeses,<br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">multiplica vivències.</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
                            L'eina definitiva per gestionar els comptes de projectes, viatges i esdeveniments sense fricció.
                        </p>
                    </div>

                    {/* HERO CARD (Input & CTA) */}
                    <div className="w-full max-w-md p-2 rounded-[2rem] shadow-2xl shadow-indigo-200/50 dark:shadow-none bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/50 dark:border-slate-700/50">
                        <div className="bg-white/80 dark:bg-slate-900/80 rounded-[1.5rem] p-6 border border-white/20 dark:border-slate-800 backdrop-blur-sm">
                             <form onSubmit={handleJoinManual} className="flex gap-2 mb-4">
                                <input 
                                    type="text" 
                                    placeholder="Codi de projecte..." 
                                    className="flex-1 px-4 py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white font-bold placeholder:text-slate-400 outline-none transition-all" 
                                    value={inputValue} 
                                    onChange={(e) => setInputValue(e.target.value)} 
                                />
                                <button type="submit" disabled={!inputValue} className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-5 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors border border-slate-200 dark:border-slate-700">
                                    <ArrowRight size={24}/>
                                </button>
                             </form>
                             
                             <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                                <span className="flex-shrink-0 mx-4 text-slate-400 text-[10px] font-bold uppercase tracking-widest">o crea el teu projecte</span>
                                <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                             </div>
                             
                             <button onClick={() => setIsAuthModalOpen(true)} className="w-full mt-2 py-4 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-indigo-600 dark:to-indigo-500 text-white font-bold text-lg rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200 dark:shadow-indigo-500/20">
                                Començar Gratis <ChevronRight size={20}/>
                             </button>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 w-full max-w-5xl mt-8">
                        <BentoCard icon={CreditCard} title="Comptes Clars" desc="Afegeix despeses en segons. Reparteix a parts iguals." color="bg-blue-500"/>
                        <BentoCard icon={PieChart} title="Temps Real" desc="Tothom veu el mateix. Sincronització instantània." color="bg-indigo-500"/>
                        <BentoCard icon={ShieldCheck} title="Liquidació Fàcil" desc="L'algoritme calcula els mínims pagaments per saldar el deute." color="bg-teal-500"/>
                    </div>
                </div>
            ) : (
                /* 2. DASHBOARD (USER LOGGED IN) */
                <div className="w-full max-w-5xl mx-auto py-6 animate-fade-in">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white mb-1 tracking-tight">{greeting}, <span className="text-indigo-600 dark:text-indigo-400">{userName}.</span></h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Aquí tens els teus projectes actius.</p>
                        </div>
                        <div className="flex gap-2">
                             {actionState === 'idle' ? (
                                <button onClick={() => setActionState('creating')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-2 active:scale-95"><Plus size={20} /> Nou Projecte</button>
                             ) : (
                                <button onClick={() => { setActionState('idle'); setInputValue(''); }} className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 px-6 py-3 rounded-2xl font-bold border border-slate-200 dark:border-slate-700 transition-all hover:bg-slate-50">Cancel·lar</button>
                             )}
                             {actionState === 'idle' && (
                                <button onClick={() => setActionState('joining')} className="bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-6 py-3 rounded-2xl font-bold border border-indigo-100 dark:border-slate-700 transition-all flex items-center gap-2 hover:border-indigo-200"><KeyRound size={20} /> Tinc codi</button>
                             )}
                        </div>
                    </div>

                    {(actionState === 'creating' || actionState === 'joining') && (
                        <div className="mb-8 animate-fade-in">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-indigo-50 dark:border-indigo-900/50 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                    {actionState === 'creating' ? <><FolderGit2 size={20} className="text-indigo-500"/> Crear nou projecte</> : <><KeyRound size={20} className="text-indigo-500"/> Unir-se a un grup</>}
                                </h3>
                                <form onSubmit={handleQuickAction} className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1 space-y-3">
                                        <label className="text-xs font-bold text-slate-400 uppercase ml-1">{actionState === 'creating' ? 'Nom del projecte' : 'Codi d\'invitació'}</label>
                                        <input autoFocus type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 outline-none text-lg font-bold text-slate-800 dark:text-white focus:border-indigo-500 transition-colors" placeholder={actionState === 'creating' ? "Ex: Sopar Estiu" : "XXX-YYY-ZZZ"} value={inputValue} onChange={e => setInputValue(e.target.value)} />
                                    </div>
                                    <div className="flex items-end">
                                        <button disabled={!inputValue || isSubmitting} className="h-[54px] px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-200/50 dark:shadow-none">
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
                            myTrips.map(trip => (
                                <TripCard 
                                    key={trip.id} 
                                    trip={trip} 
                                    currentUser={user} 
                                    onNavigate={(id) => navigate(`/trip/${id}`)} 
                                    onLeave={handleLeaveTrip} 
                                />
                            ))
                        ) : (
                            <div className="col-span-full py-16 text-center bg-white/50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                                <Sparkles size={40} className="mx-auto mb-4 text-indigo-300"/>
                                <h3 className="text-xl font-bold text-slate-700 dark:text-white">Encara no tens projectes</h3>
                                <p className="text-slate-400 mt-2">Crea el primer o uneix-te a un amb el codi.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
      </div>

      <Modal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} title="Accés">
        <AuthForm onClose={() => setIsAuthModalOpen(false)} />
      </Modal>

      <style>{` 
        @keyframes pulse-slow { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.1); } }
        .animate-pulse-slow { animation: pulse-slow 8s infinite ease-in-out; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; } 
      `}</style>
    </div>
  );
}