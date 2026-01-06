import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Share2, Copy, Check, User, Crown, Trash2, Link as LinkIcon, Users } from 'lucide-react';
import Modal from '../Modal';
import { TripData, TripUser } from '../../types';
import { TripService } from '../../services/tripService';
import { auth } from '../../config/firebase';
import { ToastType } from '../Toast';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: TripData;
  showToast: (msg: string, type?: ToastType) => void;
  onUpdateTrip: () => void;
  initialTab?: 'members' | 'share'; // <--- NOU PROPIETAT
}

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-red-100 text-red-600', 'bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 
    'bg-yellow-100 text-yellow-600', 'bg-purple-100 text-purple-600', 'bg-pink-100 text-pink-600',
    'bg-indigo-100 text-indigo-600', 'bg-orange-100 text-orange-600', 'bg-teal-100 text-teal-600'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export default function GroupModal({ isOpen, onClose, trip, showToast, onUpdateTrip, initialTab = 'members' }: GroupModalProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'share'>(initialTab);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const currentUser = auth.currentUser;
  const shareUrl = `${window.location.origin}/?join=${trip.id}`;

  // Quan s'obre el modal, posem la pestanya que ens demanen
  useEffect(() => {
    if (isOpen) {
        setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(trip.id);
    setCopiedCode(true);
    showToast("Codi copiat!", 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    showToast("Enllaç copiat!", 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Segur que vols eliminar a ${userName} del grup?\nSi té despeses, quedarà marcat com a 'Ex-membre'.`)) return;
    setLoadingAction(userId);
    try {
        await TripService.leaveTrip(trip.id, userId);
        showToast(`${userName} eliminat del grup`, 'success');
        onUpdateTrip();
    } catch (error) {
        console.error(error);
        showToast("Error eliminant l'usuari", 'error');
    } finally {
        setLoadingAction(null);
    }
  };

  const handleClaimUser = async (tripUserId: string) => {
    if (!currentUser) return;
    if (!window.confirm("Aquest usuari ets tu?")) return;
    setLoadingAction(tripUserId);
    try {
        await TripService.linkUserToAccount(trip.id, tripUserId, currentUser);
        showToast("Perfil vinculat!", 'success');
        onUpdateTrip();
    } catch (error) {
        console.error(error);
        showToast("Error en vincular", 'error');
    } finally {
        setLoadingAction(null);
    }
  };

  const activeUsers = trip.users.filter(u => !u.isDeleted);
  const adminId = activeUsers.length > 0 ? activeUsers[0].id : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestió del Grup">
      
      {/* PESTANYES SUPERIORS */}
      <div className="flex border-b border-slate-100 mb-4">
        <button 
            onClick={() => setActiveTab('members')}
            className={`flex-1 pb-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'members' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
            <Users size={16}/> Membres
        </button>
        <button 
            onClick={() => setActiveTab('share')}
            className={`flex-1 pb-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'share' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
            <Share2 size={16}/> Compartir
        </button>
      </div>

      <div className="min-h-[300px]">
          {activeTab === 'share' ? (
            /* ZONA DE COMPARTIR */
            <div className="flex flex-col items-center gap-6 py-2 animate-fade-in">
                <div className="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm">
                    <QRCode value={shareUrl} size={140} />
                </div>

                <div className="w-full space-y-4">
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <p className="text-xs font-bold text-indigo-500 uppercase mb-2">Enllaç d'invitació</p>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-white px-3 py-2 rounded-lg text-sm text-indigo-900 font-medium truncate border border-indigo-200 opacity-70">
                                {shareUrl}
                            </div>
                            <button 
                                onClick={handleCopyLink} 
                                className={`px-4 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-sm ${copiedLink ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                            >
                                {copiedLink ? <Check size={18} /> : <LinkIcon size={18} />}
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Codi Manual</p>
                            <p className="font-mono font-bold text-slate-700 tracking-wider select-all text-lg">{trip.id}</p>
                        </div>
                        <button onClick={handleCopyCode} className="text-indigo-600 p-2 hover:bg-indigo-100 rounded-lg transition-colors">
                            {copiedCode ? <Check size={20}/> : <Copy size={20}/>}
                        </button>
                    </div>
                </div>
            </div>
          ) : (
            /* ZONA DE MEMBRES */
            <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-3 px-1">
                    <p className="text-xs font-bold text-slate-400 uppercase">{activeUsers.length} Participants</p>
                </div>
                
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                    {activeUsers.map((u: TripUser) => {
                        const avatarClass = u.photoUrl ? 'bg-white' : getAvatarColor(u.name);
                        const isLinked = !!u.linkedUid;
                        const isMe = currentUser && u.linkedUid === currentUser.uid;

                        return (
                            <div key={u.id} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border border-slate-100 overflow-hidden ${avatarClass}`}>
                                        {u.photoUrl ? <img src={u.photoUrl} alt={u.name} className="w-full h-full object-cover" /> : u.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <p className={`font-bold text-sm ${isMe ? 'text-indigo-700' : 'text-slate-800'}`}>
                                                {u.name} {isMe && '(Tu)'}
                                            </p>
                                            {u.id === adminId && <Crown size={12} className="text-yellow-500 fill-yellow-500" />}
                                        </div>
                                        <p className="text-[10px] text-slate-400">
                                            {isLinked ? 'Verificat' : 'Convidat'}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                    {!isLinked && currentUser && (
                                        <button onClick={() => handleClaimUser(u.id)} disabled={loadingAction === u.id} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                                            Sóc jo
                                        </button>
                                    )}
                                    
                                    {!isMe && (
                                        <button onClick={() => handleRemoveUser(u.id, u.name)} disabled={loadingAction === u.id} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
          )}
      </div>
    </Modal>
  );
}