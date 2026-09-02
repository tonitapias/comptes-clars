// src/pages/LandingPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, ArrowRight, Wallet, Loader2, LogOut,
  KeyRound, FolderGit2, AlertTriangle, Sparkles
} from 'lucide-react';
import { signOut, User } from 'firebase/auth';

import { auth } from '../config/firebase';
import { TripService } from '../services/tripService';
import { CURRENCIES } from '../utils/constants';
import { TripData, TripUser } from '../types';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { useToast } from '../components/Toast';

// COMPONENTS
import TripCard from '../components/landing/TripCard';
import AuthForm from '../components/auth/AuthForm';

// UTILITATS PER AL CÀLCUL DEL BALANÇ (MANTENIR RISC ZERO)
import { calculateBalances, canUserLeaveTrip } from '../services/billingService';
import { isUserOwner } from '../hooks/useTripMutations';
import { BUSINESS_RULES } from '../config/businessRules';

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
  }, [user, showToast]);

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
  }, [user, inviteCode, navigate, setSearchParams, showToast]);

  // Aquest formulari només es renderitza per a un usuari NO autenticat (vegeu més avall):
  // desar la intenció d'unir-se i obrir l'accés és l'única cosa que pot fer aquí.
  const handleJoinManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setSearchParams({ join: inputValue.trim() });
    setIsAuthModalOpen(true);
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
        } catch {
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

            const isOwner = isUserOwner(targetTrip, user.uid);
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

            // Mateix marge que a dins del viatge (BUSINESS_RULES.MAX_LEAVE_BALANCE_MARGIN):
            // abans hi havia un "10" clavat aquí que no coincidia amb la resta de l'app.
            if (!canUserLeaveTrip(confirmModal.internalUserId, balances, BUSINESS_RULES.MAX_LEAVE_BALANCE_MARGIN)) {
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
    <div className="min-h-screen bg-surface-ground flex flex-col items-center p-4 md:p-8 font-sans transition-colors duration-300 selection:bg-primary/20">

      {toast}

      <div className="w-full max-w-5xl flex flex-col gap-10 flex-1">

        <nav className="flex items-center justify-between py-2">
           <div className="flex items-center gap-3">
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <Wallet size={22} className="text-primary" strokeWidth={2.5} />
              </div>
              <span className="font-black text-lg text-content-body hidden md:block tracking-tight">Comptes Clars</span>
           </div>

           {user ? (
             <div className="flex items-center gap-3 bg-surface-card px-2 py-1.5 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm">
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${userName}`} className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700" alt="" referrerPolicy="no-referrer" />
                <span className="text-sm font-bold text-content-body pr-2 hidden sm:block">{userName}</span>
                <button onClick={() => { signOut(auth).then(() => window.location.reload()); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-rose-50 dark:bg-slate-700 text-content-muted hover:text-status-error transition-colors" title="Tancar sessió">
                    <LogOut size={16} strokeWidth={2.5}/>
                </button>
             </div>
           ) : (
             <Button variant="secondary" onClick={() => setIsAuthModalOpen(true)} className="h-11 px-5">
                Iniciar sessió
             </Button>
           )}
        </nav>

        <main className="flex-1 flex flex-col justify-center">

            {!user ? (
                <div className="flex flex-col items-center text-center gap-12 py-16 md:py-24 animate-fade-in">
                    <div className="max-w-2xl space-y-5">
                        <h1 className="text-4xl md:text-6xl font-black text-content-body leading-[1.1] tracking-tight">
                            Els comptes del grup,<br/>sempre <span className="text-primary">clars</span>.
                        </h1>
                        <p className="text-lg text-content-muted max-w-xl mx-auto leading-relaxed">
                            Registra despeses, reparteix-les com calgui i sàpigues en tot moment qui deu què a qui.
                        </p>
                    </div>

                    <div className="w-full max-w-sm flex flex-col items-center gap-6">
                        <Button
                            onClick={() => setIsAuthModalOpen(true)}
                            icon={ArrowRight}
                            className="px-8 py-3.5 text-base w-full sm:w-auto"
                        >
                            Iniciar sessió
                        </Button>

                        <div className="w-full space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                                <span className="text-[11px] font-bold text-content-subtle uppercase tracking-widest shrink-0">Tens un codi de projecte?</span>
                                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                            </div>
                            <form onSubmit={handleJoinManual} className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Codi del projecte"
                                    aria-label="Codi del projecte"
                                    className="w-full pl-4 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-4 focus:ring-primary/10 bg-surface-card text-content-body font-semibold placeholder:text-content-subtle outline-none transition-all"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                />
                                <Button type="submit" variant="secondary" disabled={!inputValue} aria-label="Continuar" className="w-14 shrink-0 px-0">
                                    <ArrowRight size={20}/>
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="w-full max-w-5xl mx-auto py-6 animate-fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <h2 className="text-2xl md:text-3xl font-black text-content-body tracking-tight">{greeting}, <span className="text-primary">{userName}.</span></h2>
                        <div className="flex gap-3">
                             {actionState === 'idle' ? (
                                <Button onClick={() => setActionState('creating')} icon={Plus} className="h-11 px-5">
                                    Nou projecte
                                </Button>
                             ) : (
                                <Button variant="secondary" onClick={() => { setActionState('idle'); setInputValue(''); }} className="h-11 px-5">
                                    Cancel·lar
                                </Button>
                             )}

                             {actionState === 'idle' && (
                                <Button variant="secondary" icon={KeyRound} onClick={() => setActionState('joining')} className="h-11 px-5">
                                    Tinc codi
                                </Button>
                             )}
                        </div>
                    </div>

                    {(actionState === 'creating' || actionState === 'joining') && (
                        <div className="mb-10 animate-slide-up">
                            <div className="bg-surface-card p-6 md:p-8 rounded-3xl shadow-financial-md border border-slate-100 dark:border-slate-800">
                                <h3 className="text-lg font-bold text-content-body mb-6 flex items-center gap-2">
                                    {actionState === 'creating' ? <><FolderGit2 size={22} className="text-primary"/> Crear nou projecte</> : <><KeyRound size={22} className="text-primary"/> Unir-se a un grup</>}
                                </h3>
                                <form onSubmit={handleQuickAction} className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1 space-y-2">
                                        <label className="text-xs font-bold text-content-subtle uppercase ml-1 tracking-wider">
                                            {actionState === 'creating' ? 'Nom del projecte' : 'Codi d\'invitació'}
                                        </label>
                                        <input
                                            autoFocus
                                            type="text"
                                            className="w-full bg-surface-ground border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 outline-none text-lg font-bold text-content-body focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-content-subtle/50"
                                            placeholder={actionState === 'creating' ? "Ex: Sopar Estiu" : "XXX-YYY-ZZZ"}
                                            value={inputValue}
                                            onChange={e => setInputValue(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <Button type="submit" disabled={!inputValue || isSubmitting} loading={isSubmitting} className="h-[52px] px-8">
                                            {!isSubmitting && <ArrowRight size={22}/>}
                                        </Button>
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
                            <div className="col-span-full py-20 text-center bg-surface-card rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <Sparkles size={40} className="mx-auto mb-4 text-indigo-200 dark:text-indigo-900"/>
                                <h3 className="text-lg font-bold text-content-body">Encara no tens projectes</h3>
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
                    className="h-12"
                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                >
                    Cancel·la
                </Button>
                <Button
                    variant="danger"
                    fullWidth
                    className="h-12"
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
