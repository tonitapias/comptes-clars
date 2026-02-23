// src/pages/LandingPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Plus, ArrowRight, Wallet, Loader2, LogOut, ChevronRight, 
  Sparkles, KeyRound, CreditCard, PieChart, ShieldCheck, FolderGit2,
  AlertTriangle 
} from 'lucide-react';
import { signOut, User } from 'firebase/auth';

import { auth } from '../config/firebase';
import { TripService } from '../services/tripService';
import { CURRENCIES } from '../utils/constants';
import { TripData, TripUser, unbrand } from '../types'; // [FIX]: Importem unbrand
import Modal from '../components/Modal';
import Button from '../components/Button';
import { useToast } from '../components/Toast';

// COMPONENTS
import BentoCard from '../components/landing/BentoCard';
import TripCard from '../components/landing/TripCard';
import AuthForm from '../components/auth/AuthForm';

// UTILITATS PER AL CÀLCUL DEL BALANÇ (MANTENIR RISC ZERO)
import { calculateBalances } from '../services/billingService';

// --- TIPUS ---
type ActionState = 'idle' | 'creating' | 'joining';

interface LandingPageProps {
  user: User | null;
}

export default function LandingPage({ user }: LandingPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const inviteCode = searchParams.get('join');
  const { toast, showToast } = useToast(); 
  
  const [myTrips, setMyTrips] = useState<TripData[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [actionState, setActionState] = useState<ActionState>('idle');
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Estat per al Modal de Confirmació
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    tripId: string;
    tripName: string;
    internalUserId?: string;
  }>({ isOpen: false, tripId: '', tripName: '' });
  const [isLeaving, setIsLeaving] = useState(false);

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
          showToast("Error carregant els teus projectes", "error");
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
          showToast("T'has unit al projecte correctament!", "success");
          navigate(`/trip/${inviteCode}`);
        } catch (error) {
          console.error("Error en auto-join:", error);
          showToast("L'enllaç d'invitació no és vàlid o ha caducat", "error");
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
            showToast("T'has unit al grup!", "success");
            navigate(`/trip/${inputValue.trim()}`);
        } catch (err) { 
            showToast("Codi de projecte invàlid o no trobat", "error");
        } finally { setIsSubmitting(false); }
    } else if (actionState === 'creating' && user) {
        setIsSubmitting(true);
        try {
            const newId = Math.random().toString(36).substring(2, 9);
            
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
            showToast("Projecte creat correctament!", "success");
            navigate(`/trip/${newId}`);
        } catch (err) { 
            console.error(err);
            showToast("No s'ha pogut crear el projecte", "error"); 
        } finally { setIsSubmitting(false); }
    }
  };

  const requestLeaveTrip = (e: React.MouseEvent, tripId: string, internalUserId: string | undefined, tripName: string) => {
    e.stopPropagation();
    setConfirmModal({
        isOpen: true,
        tripId,
        tripName,
        internalUserId
    });
  };

  const confirmLeaveTrip = async () => {
    if (!confirmModal.tripId || !user) return;
    
    setIsLeaving(true); 

    try {
        const targetTrip = myTrips.find(t => t.id === confirmModal.tripId);
        if (targetTrip) {
            
            const isOwner = targetTrip.ownerId === user.uid;
            const activeUsers = targetTrip.users.filter(u => !u.isDeleted).length;

            if (isOwner && activeUsers <= 1) {
                showToast("Ets l'últim membre actiu. Entra al projecte i elimina'l des de la configuració.", "warning");
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setIsLeaving(false);
                return;
            }

            const realExpenses = await TripService.getTripExpenses(confirmModal.tripId);
            const realPayments = await TripService.getTripPayments(confirmModal.tripId);
            
            // [FIX ARQUITECTURA]: Fusionem i DEDUPLIQUEM els pagaments respectant el seu ID.
            // Això evita que les liquidacions recents es comptin el doble durant el càlcul de sortida.
            const rawPayments = [...(targetTrip.payments || []), ...realPayments];
            const allPayments = Array.from(new Map(rawPayments.map(p => [p.id, p])).values());
            
            const balances = calculateBalances(realExpenses, targetTrip.users, allPayments);
            const myBalance = balances.find(b => b.userId === confirmModal.internalUserId)?.amount || 0;
            
            const numericBalance = typeof unbrand === 'function' ? unbrand(myBalance as any) : Number(myBalance);

            if (Math.abs(numericBalance) > 10) { 
                showToast("No pots sortir d'un viatge si tens deutes pendents o et deuen diners.", "error");
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setIsLeaving(false);
                return; 
            }
        }

        if (confirmModal.internalUserId) {
            await TripService.leaveTrip(confirmModal.tripId, confirmModal.internalUserId);
        }
        
        setMyTrips(prev => prev.filter(t => t.id !== confirmModal.tripId));
        showToast(`Has sortit de "${confirmModal.tripName}"`, "success");
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } catch (err) { 
        console.error("Error al sortir:", err);
        showToast("Error al sortir del grup. Torna-ho a provar.", "error");
    } finally {
        setIsLeaving(false);
    }
  };

  const userName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuari';

  if (isJoining) return <div className="min-h-screen flex items-center justify-center bg-surface-ground"><Loader2 className="animate-spin text-primary w-10 h-10"/></div>;

  return (
    <div className="min-h-screen bg-surface-ground flex flex-col items-center p-4 md:p-8 font-sans transition-colors duration-300 relative overflow-x-hidden selection:bg-primary/20">
      
      {toast}

      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/40 via-transparent to-transparent dark:from-indigo-900/10"></div>

      <div className="w-full max-w-6xl relative z-10 flex flex-col gap-8 h-full">
        
        <nav className="flex items-center justify-between py-2">
           <div className="flex items-center gap-3">
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <Wallet size={24} className="text-primary" strokeWidth={2.5} />
              </div>
              <span className="font-black text-xl text-content-body hidden md:block tracking-tight">Comptes Clars</span>
           </div>
           
           {user ? (
             <div className="flex items-center gap-3 bg-surface-card px-2 py-1.5 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 p-0.5">
                    <img src={user.photoURL || `https://ui-avatars.com/api/?name=${userName}`} className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-800" alt="Avatar" referrerPolicy="no-referrer" />
                </div>
                <span className="text-sm font-bold text-content-body pr-2 hidden sm:block">{userName}</span>
                <button onClick={() => { signOut(auth).then(() => window.location.reload()); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-rose-50 dark:bg-slate-700 text-content-muted hover:text-status-error transition-colors" title="Tancar Sessió">
                    <LogOut size={16} strokeWidth={2.5}/>
                </button>
             </div>
           ) : (
             <button onClick={() => setIsAuthModalOpen(true)} className="px-5 py-2.5 bg-surface-card text-primary font-bold rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 text-sm hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95 active:translate-y-0">
                Iniciar Sessió
             </button>
           )}
        </nav>

        <main className="flex-1 flex flex-col justify-center">
            
            {!user ? (
                <div className="flex flex-col items-center text-center gap-12 py-12 md:py-20 animate-fade-in">
                    <div className="max-w-3xl space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 text-xs font-bold uppercase tracking-wider mb-2 shadow-sm">
                            <Sparkles size={14}/> Gestió de despeses
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-content-body leading-[1.05] tracking-tight">
                            Divideix despeses,<br/>
                            <span className="text-primary">multiplica vivències.</span>
                        </h1>
                        <p className="text-lg md:text-xl text-content-muted max-w-2xl mx-auto leading-relaxed font-medium">
                            L'eina definitiva per gestionar els comptes de projectes, viatges i esdeveniments sense fricció.
                        </p>
                    </div>

                    <div className="w-full max-w-md relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                        
                        <div className="relative bg-surface-card rounded-[1.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-financial-lg">
                             <form onSubmit={handleJoinManual} className="flex gap-2 mb-4">
                                <div className="relative flex-1">
                                    <input 
                                        type="text" 
                                        placeholder="Codi de projecte..." 
                                        className="w-full pl-4 pr-4 py-3.5 rounded-xl border-2 border-slate-100 dark:border-slate-700 focus:border-primary focus:ring-4 focus:ring-primary/10 bg-surface-ground text-content-body font-bold placeholder:text-content-subtle outline-none transition-all" 
                                        value={inputValue} 
                                        onChange={(e) => setInputValue(e.target.value)} 
                                    />
                                </div>
                                <button type="submit" disabled={!inputValue} className="bg-surface-ground text-content-body px-4 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors border border-slate-200 dark:border-slate-700">
                                    <ArrowRight size={24}/>
                                </button>
                             </form>
                             
                             <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
                                <span className="flex-shrink-0 mx-4 text-content-subtle text-[10px] font-bold uppercase tracking-widest">o crea el teu projecte</span>
                                <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
                             </div>
                             
                             <button onClick={() => setIsAuthModalOpen(true)} className="w-full mt-2 py-3.5 bg-primary hover:bg-primary-hover text-white font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200/50 dark:shadow-none active:scale-[0.98]">
                                Començar Gratis <ChevronRight size={20}/>
                             </button>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-5 w-full max-w-5xl mt-8">
                        <BentoCard icon={CreditCard} title="Ràpid" desc="Afegeix despeses en segons. Reparteix automàticament." color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"/>
                        <BentoCard icon={PieChart} title="Transparent" desc="Tothom veu el mateix. Sincronització instantània." color="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400"/>
                        <BentoCard icon={ShieldCheck} title="Just" desc="Algoritme de deute mínim. Liquida amb pocs moviments." color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"/>
                    </div>
                </div>
            ) : (
                <div className="w-full max-w-5xl mx-auto py-6 animate-fade-in">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-black text-content-body mb-2 tracking-tight">{greeting}, <span className="text-primary">{userName}.</span></h2>
                            <p className="text-content-muted font-medium text-lg">Aquí tens els teus projectes actius.</p>
                        </div>
                        <div className="flex gap-3">
                             {actionState === 'idle' ? (
                                <button onClick={() => setActionState('creating')} className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-2xl font-bold shadow-financial-md hover:shadow-financial-lg transition-all flex items-center gap-2 active:scale-95">
                                    <Plus size={20} strokeWidth={3} /> Nou Projecte
                                </button>
                             ) : (
                                <button onClick={() => { setActionState('idle'); setInputValue(''); }} className="bg-surface-card text-content-muted px-6 py-3 rounded-2xl font-bold border border-slate-200 dark:border-slate-700 transition-all hover:bg-surface-ground">
                                    Cancel·lar
                                </button>
                             )}
                             
                             {actionState === 'idle' && (
                                <button onClick={() => setActionState('joining')} className="bg-surface-card text-primary px-6 py-3 rounded-2xl font-bold border border-indigo-100 dark:border-slate-800 transition-all flex items-center gap-2 hover:border-indigo-200 hover:shadow-sm">
                                    <KeyRound size={20} /> Tinc codi
                                </button>
                             )}
                        </div>
                    </div>

                    {(actionState === 'creating' || actionState === 'joining') && (
                        <div className="mb-10 animate-slide-up">
                            <div className="bg-surface-card p-6 md:p-8 rounded-[2rem] shadow-financial-lg border border-indigo-100 dark:border-indigo-900/30 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-2 h-full bg-primary"></div>
                                <h3 className="text-xl font-bold text-content-body mb-6 flex items-center gap-2">
                                    {actionState === 'creating' ? <><FolderGit2 size={24} className="text-primary"/> Crear nou projecte</> : <><KeyRound size={24} className="text-primary"/> Unir-se a un grup</>}
                                </h3>
                                <form onSubmit={handleQuickAction} className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1 space-y-2">
                                        <label className="text-xs font-bold text-content-subtle uppercase ml-1 tracking-wider">
                                            {actionState === 'creating' ? 'Nom del projecte' : 'Codi d\'invitació'}
                                        </label>
                                        <input 
                                            autoFocus 
                                            type="text" 
                                            className="w-full bg-surface-ground border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3.5 outline-none text-xl font-bold text-content-body focus:border-primary transition-colors placeholder:text-content-subtle/50" 
                                            placeholder={actionState === 'creating' ? "Ex: Sopar Estiu" : "XXX-YYY-ZZZ"} 
                                            value={inputValue} 
                                            onChange={e => setInputValue(e.target.value)} 
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <button disabled={!inputValue || isSubmitting} className="h-[60px] px-8 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-200/50 dark:shadow-none active:scale-95">
                                            {isSubmitting ? <Loader2 className="animate-spin"/> : <ArrowRight size={28}/>}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loadingTrips ? (
                            [1,2,3].map(i => <div key={i} className="h-48 bg-surface-card animate-pulse rounded-3xl border border-slate-100 dark:border-slate-800"></div>)
                        ) : myTrips.length > 0 ? (
                            myTrips.map(trip => (
                                <TripCard 
                                    key={trip.id} 
                                    trip={trip} 
                                    currentUser={user} 
                                    onNavigate={(id) => navigate(`/trip/${id}`)} 
                                    onLeave={requestLeaveTrip} 
                                />
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center bg-surface-card rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <Sparkles size={48} className="mx-auto mb-4 text-indigo-200 dark:text-indigo-900"/>
                                <h3 className="text-xl font-bold text-content-body">Encara no tens projectes</h3>
                                <p className="text-content-muted mt-2 max-w-xs mx-auto">Crea el primer o uneix-te a un amb el codi per començar.</p>
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

      <Modal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
        title="Sortir del projecte"
      >
        <div className="p-4 space-y-6">
            <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-2xl flex gap-4 border border-rose-100 dark:border-rose-900/30">
                <div className="bg-white dark:bg-rose-950 p-2 rounded-xl h-fit shadow-sm">
                    <AlertTriangle className="text-rose-500" size={24} />
                </div>
                <div className="space-y-1">
                    <h4 className="font-bold text-rose-700 dark:text-rose-300">Estàs segur?</h4>
                    <p className="text-sm text-rose-600/80 dark:text-rose-400 leading-relaxed">
                        Estàs a punt de sortir de <strong>"{confirmModal.tripName}"</strong>. Si encara tens deutes pendents, hauràs de resoldre'ls abans o contactar amb l'administrador.
                    </p>
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <Button 
                    variant="secondary" 
                    fullWidth 
                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                >
                    Cancel·la
                </Button>
                <Button 
                    variant="danger" 
                    fullWidth 
                    loading={isLeaving}
                    onClick={confirmLeaveTrip}
                >
                    Sí, vull sortir
                </Button>

            
            </div>
        </div>
      </Modal>

      <style>{` 
        .custom-scrollbar::-webkit-scrollbar { width: 4px; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; } 
      `}</style>
    </div>
  );
}