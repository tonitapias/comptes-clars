import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, LogIn, LogOut, ChevronRight, Calendar, Loader2, Trash2 } from 'lucide-react';
import { doc, setDoc, updateDoc, arrayRemove, collection, query, where, getDocs } from 'firebase/firestore';
import { User, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'; 

import Card from '../components/Card';
import Button from '../components/Button';
import { db, appId, auth } from '../config/firebase';
import { CURRENCIES } from '../utils/constants';
import { TripData } from '../types';

interface LandingPageProps {
  user: User | null;
}

type ViewMode = 'menu' | 'create' | 'join';

export default function LandingPage({ user }: LandingPageProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ViewMode>('menu');
  const [inputName, setInputName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [inputCode, setInputCode] = useState('');
  
  // Loading general per accions (crear viatge, etc.)
  const [loading, setLoading] = useState(false);
  // Loading específic per al Login perquè no bloquegi tota l'app si falla
  const [loginLoading, setLoginLoading] = useState(false);
  
  const [myTrips, setMyTrips] = useState<TripData[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);

  const isGuest = !user || user.isAnonymous;

  // --- CÀRREGA DE VIATGES ---
  useEffect(() => {
    async function fetchMyTrips() {
      if (!user || user.isAnonymous) {
        setMyTrips([]);
        return;
      }
      setLoadingTrips(true);
      try {
        const tripsRef = collection(db, 'artifacts', appId, 'public', 'data', 'trips');
        const q = query(tripsRef, where('memberUids', 'array-contains', user.uid));
        const querySnapshot = await getDocs(q);
        
        const trips: TripData[] = [];
        querySnapshot.forEach((doc) => {
          trips.push(doc.data() as TripData);
        });
        
        trips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setMyTrips(trips);
      } catch (e) {
        console.error("Error carregant els meus viatges:", e);
      } finally {
        setLoadingTrips(false);
      }
    }

    fetchMyTrips();
  }, [user]);

  // --- LOGIN AMB POPUP (Optimitzat per a Mòbil) ---
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setLoginLoading(true); // Activem spinner

    try {
      // Fem servir Popup perquè Redirect falla per temes de Cookies (ITP) en mòbils
      await signInWithPopup(auth, provider);
      // Si funciona, l'estat 'user' canviarà sol i el component es renderitzarà de nou
    } catch (error: any) {
      console.error("Error Login:", error);
      
      // Si l'usuari tanca la finestra o cancel·la, traiem el loading i no fem res més
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        setLoginLoading(false);
        return;
      }

      // Si és un altre error, avisem
      alert("Error iniciant sessió: " + error.message);
      setLoginLoading(false);
    } finally {
       // Per seguretat, si passa qualsevol cosa rara, traiem el loading després de 5 segons
       setTimeout(() => setLoginLoading(false), 5000);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('cc-last-trip-id');
    window.location.reload();
  };

  // --- ACCIONS DE VIATGE ---
  const handleRemoveTrip = async (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const confirm = window.confirm("Vols treure aquest viatge de la teva llista?");
    if (!confirm) return;
    try {
      const tripRef = doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`);
      await updateDoc(tripRef, { memberUids: arrayRemove(user.uid) });
      setMyTrips(prev => prev.filter(t => t.id !== tripId));
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  };

  const createTrip = async () => {
    const finalCreatorName = isGuest ? creatorName : (user?.displayName || creatorName);
    if (!finalCreatorName) return;

    setLoading(true);
    try {
      const newId = Math.random().toString(36).substring(2, 9);
      const newTrip: TripData = { 
        id: newId, 
        name: inputName, 
        users: [finalCreatorName], 
        expenses: [], 
        currency: CURRENCIES[0], 
        createdAt: new Date().toISOString(),
        memberUids: user ? [user.uid] : [] 
      };
      
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${newId}`), newTrip);
      navigate(`/trip/${newId}`);
    } catch (e: any) {
      alert("Error: " + e.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-b-[50%] scale-150 -translate-y-1/2"></div>
      
      <div className="absolute top-4 right-4 z-20 animate-fade-in">
        {!isGuest ? (
           <button onClick={handleLogout} className="flex items-center gap-2 bg-white/20 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold hover:bg-white/30 transition shadow-sm border border-white/20">
             {user?.photoURL && <img src={user.photoURL} alt="Avatar" className="w-5 h-5 rounded-full border border-white/50"/>}
             <span>{user?.displayName?.split(' ')[0] || 'Usuari'}</span>
             <LogOut size={12} className="opacity-70"/>
           </button>
        ) : (
           <button 
             onClick={handleGoogleLogin} 
             disabled={loginLoading}
             className={`flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-full text-xs font-bold shadow-lg transition ${loginLoading ? 'opacity-70 cursor-wait' : 'hover:bg-slate-100'}`}
           >
             {loginLoading ? <Loader2 size={14} className="animate-spin"/> : <LogIn size={14}/>} 
             {loginLoading ? 'Connectant...' : 'Entrar amb Google'}
           </button>
        )}
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
           <div className="bg-white/20 backdrop-blur-md w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-white/30"><Cloud className="text-white" size={40} /></div>
           <h1 className="text-4xl font-black text-slate-800 mb-2">Comptes Clars</h1>
           <p className="text-slate-500 font-medium">Gestiona les despeses en grup.</p>
        </div>
        
        <Card className="p-8 shadow-xl border-0">
          {mode === 'menu' && (
            <div className="space-y-4">
              <Button onClick={() => setMode('create')} className="w-full py-4 text-lg">Crear nou grup</Button>
              <Button variant="secondary" onClick={() => setMode('join')} className="w-full py-4 text-lg">Tinc un codi</Button>
              
              {!isGuest && myTrips.length > 0 && (
                <div className="pt-6 animate-fade-in">
                  <p className="text-xs text-slate-400 mb-3 font-bold uppercase tracking-wider">Els meus viatges ({myTrips.length})</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {myTrips.map(trip => (
                      <div key={trip.id} onClick={() => navigate(`/trip/${trip.id}`)} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-indigo-50 hover:border-indigo-100 transition cursor-pointer group relative">
                        <div>
                          <p className="font-bold text-slate-700 group-hover:text-indigo-700 transition pr-6">{trip.name}</p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1"><Calendar size={10}/> {new Date(trip.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-3">
                           <button onClick={(e) => handleRemoveTrip(trip.id, e)} className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-all" title="Treure de la llista"><Trash2 size={16} /></button>
                           <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-400 transition"/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {loadingTrips && <div className="text-center py-4"><Loader2 className="animate-spin mx-auto text-indigo-400" size={20}/><p className="text-xs text-slate-400 mt-2">Buscant viatges...</p></div>}
              
              {!loadingTrips && !isGuest && myTrips.length === 0 && (
                <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                   <p className="text-xs text-slate-400">Encara no tens viatges guardats.</p>
                </div>
              )}

              {isGuest && localStorage.getItem('cc-last-trip-id') && (
                 <div className="pt-4 border-t border-slate-100 text-center animate-fade-in">
                    <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Últim visitat</p>
                    <button onClick={() => navigate(`/trip/${localStorage.getItem('cc-last-trip-id')}`)} className="text-indigo-600 font-bold text-sm hover:underline bg-indigo-50 px-3 py-1 rounded-lg">
                      Tornar al grup anterior
                    </button>
                 </div>
              )}
            </div>
          )}

          {mode === 'create' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nom del grup</label>
                <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" value={inputName} onChange={e => setInputName(e.target.value)} placeholder="Ex: Viatge a Menorca" />
              </div>
              {isGuest && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">El teu nom</label>
                  <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" value={creatorName} onChange={e => setCreatorName(e.target.value)} placeholder="Ex: Laura" />
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" onClick={() => setMode('menu')}>Enrere</Button>
                <Button className="flex-1" loading={loading} disabled={!inputName || (isGuest && !creatorName)} onClick={createTrip}>Començar</Button>
              </div>
            </div>
          )}

          {mode === 'join' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Codi del grup</label>
                <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-center text-lg uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/20 transition-all" value={inputCode} onChange={e => setInputCode(e.target.value)} placeholder="XXX-YYY" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" onClick={() => setMode('menu')}>Enrere</Button>
                <Button className="flex-1" disabled={inputCode.length < 3} onClick={() => navigate(`/trip/${inputCode}`)}>Entrar</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
      <style>{`@keyframes fade-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fade-in 0.3s ease-out forwards; } .cursor-wait { cursor: wait; }`}</style>
    </div>
  );
}