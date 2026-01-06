import React, { useState } from 'react';
import { Share2, Copy, Check, User, Crown, Trash2, Edit2 } from 'lucide-react'; // Icones actualitzades
import Modal from '../Modal';
import { TripData, TripUser } from '../../types';
import { TripService } from '../../services/tripService';
import { auth } from '../../config/firebase';
import { ToastType } from '../Toast'; // Assegura't d'importar el tipus si el tens definit

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: TripData;
  showToast: (msg: string, type?: ToastType) => void;
  onUpdateTrip: () => void; // Callback per refrescar dades
}

// 1. Helper per generar colors consistents (Mateixa lògica que a ExpensesList)
const getAvatarColor = (name: string) => {
  const colors = [
    'bg-red-100 text-red-600', 
    'bg-blue-100 text-blue-600', 
    'bg-green-100 text-green-600', 
    'bg-yellow-100 text-yellow-600', 
    'bg-purple-100 text-purple-600', 
    'bg-pink-100 text-pink-600',
    'bg-indigo-100 text-indigo-600',
    'bg-orange-100 text-orange-600',
    'bg-teal-100 text-teal-600',
    'bg-cyan-100 text-cyan-600'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function GroupModal({ isOpen, onClose, trip, showToast, onUpdateTrip }: GroupModalProps) {
  const [copied, setCopied] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Per saber qui és l'usuari actual connectat
  const currentUser = auth.currentUser;

  // COPIAR CODI
  const handleCopyCode = () => {
    navigator.clipboard.writeText(trip.id);
    setCopied(true);
    showToast("Codi copiat al porta-retalls!", 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // ELIMINAR USUARI
  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Segur que vols eliminar a ${userName} del grup?`)) return;
    setLoadingAction(userId);
    try {
        await TripService.removeUserFromTrip(trip.id, userId);
        showToast(`${userName} eliminat correctament`, 'success');
        onUpdateTrip();
    } catch (error) {
        console.error(error);
        showToast("Error eliminant l'usuari", 'error');
    } finally {
        setLoadingAction(null);
    }
  };

  // VINCULAR PERFIL ("SÓC JO")
  const handleClaimUser = async (tripUserId: string) => {
    if (!currentUser) return;
    const confirm = window.confirm("Aquest usuari ets tu? Es vincularà al teu compte actual.");
    if (!confirm) return;

    setLoadingAction(tripUserId);
    try {
        await TripService.linkUserToAccount(trip.id, tripUserId, currentUser);
        showToast("Perfil vinculat correctament!", 'success');
        onUpdateTrip();
    } catch (error) {
        console.error(error);
        showToast("Error en vincular el perfil", 'error');
    } finally {
        setLoadingAction(null);
    }
  };

  // Identificar "admin" visual (el primer de la llista)
  const adminId = trip.users.length > 0 ? trip.users[0].id : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Membres del Grup">
      <div className="space-y-6">
        
        {/* TARGETA DE CODI D'INVITACIÓ */}
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
                    <Share2 size={14}/> Codi d'invitació
                </span>
                {copied && <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-md animate-fade-in">Copiat!</span>}
            </div>
            <div className="flex gap-2">
                <div className="flex-1 bg-white border border-indigo-200 rounded-lg px-3 py-2 font-mono text-center font-bold text-lg text-indigo-900 tracking-widest select-all">
                    {trip.id}
                </div>
                <button onClick={handleCopyCode} className="bg-indigo-600 text-white px-3 rounded-lg hover:bg-indigo-700 transition shadow-sm">
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
            </div>
            <p className="text-xs text-indigo-400 mt-2 leading-relaxed">
                Comparteix aquest codi perquè altres s'uneixin des de la pantalla d'inici.
            </p>
        </div>

        {/* LLISTA D'USUARIS */}
        <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3 px-1 flex items-center gap-2">
                <User size={16} className="text-slate-400"/> Participants ({trip.users.length})
            </h3>
            
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                {trip.users.map((u: TripUser) => {
                    // LÒGICA VISUAL AVATAR
                    // Si té foto -> fons blanc. Si no -> color dinàmic.
                    const avatarClass = u.photoUrl ? 'bg-white' : getAvatarColor(u.name);
                    
                    // LÒGICA D'ESTAT
                    const isLinked = !!u.linkedUid; // Té un compte vinculat?
                    const isMe = currentUser && u.linkedUid === currentUser.uid; // Sóc jo?

                    return (
                        <div key={u.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:border-indigo-100 transition-colors">
                            <div className="flex items-center gap-3">
                                
                                {/* AVATAR RODÓ */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border border-slate-100 shadow-sm overflow-hidden ${avatarClass}`}>
                                    {u.photoUrl ? (
                                        <img src={u.photoUrl} alt={u.name} className="w-full h-full object-cover" />
                                    ) : (
                                        u.name.charAt(0).toUpperCase()
                                    )}
                                </div>
                                
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <p className={`font-bold text-sm ${isMe ? 'text-indigo-700' : 'text-slate-800'}`}>
                                            {u.name} {isMe && '(Tu)'}
                                        </p>
                                        {u.id === adminId && <Crown size={12} className="text-yellow-500 fill-yellow-500" />}
                                    </div>
                                    
                                    {/* ETIQUETES D'ESTAT */}
                                    {isLinked ? (
                                        <p className="text-[10px] text-green-600 flex items-center gap-0.5 font-medium">
                                            <Check size={10}/> Verificat
                                        </p>
                                    ) : (
                                        <p className="text-[10px] text-slate-400">Usuari provisional</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* BOTÓ "SÓC JO" 
                                    (Només si no té propietari, jo estic loguejat, i no sóc jo mateix) 
                                */}
                                {!isLinked && currentUser && (
                                    <button 
                                        onClick={() => handleClaimUser(u.id)}
                                        disabled={loadingAction === u.id}
                                        className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100"
                                    >
                                        Sóc jo
                                    </button>
                                )}

                                {/* BOTÓ ELIMINAR */}
                                <button 
                                    onClick={() => handleRemoveUser(u.id, u.name)}
                                    disabled={loadingAction === u.id}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Eliminar del grup"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </Modal>
  );
}