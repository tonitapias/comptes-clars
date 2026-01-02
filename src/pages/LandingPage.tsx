import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';

import Card from '../components/Card';
import Button from '../components/Button';
import { db, appId } from '../config/firebase';
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedTrip = localStorage.getItem('cc-last-trip-id');
    if (savedTrip) {
      navigate(`/trip/${savedTrip}`);
    }
  }, []);

  const createTrip = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const newId = Math.random().toString(36).substring(2, 9);
      const newTrip: TripData = { 
        id: newId, 
        name: inputName, 
        users: [creatorName], 
        expenses: [], 
        currency: CURRENCIES[0], 
        createdAt: new Date().toISOString() 
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
            </div>
          )}
          {mode === 'create' && (
            <div className="space-y-4 animate-fade-in">
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Nom del grup</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={inputName} onChange={e => setInputName(e.target.value)} /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">El teu nom</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={creatorName} onChange={e => setCreatorName(e.target.value)} /></div>
              <div className="flex gap-2 pt-2"><Button variant="ghost" onClick={() => setMode('menu')}>Enrere</Button><Button className="flex-1" loading={loading} disabled={!inputName || !creatorName} onClick={createTrip}>Començar</Button></div>
            </div>
          )}
          {mode === 'join' && (
            <div className="space-y-4 animate-fade-in">
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Codi del grup</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-center text-lg uppercase" value={inputCode} onChange={e => setInputCode(e.target.value)} /></div>
              <div className="flex gap-2 pt-2"><Button variant="ghost" onClick={() => setMode('menu')}>Enrere</Button><Button className="flex-1" disabled={inputCode.length < 3} onClick={() => navigate(`/trip/${inputCode}`)}>Entrar</Button></div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}