import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Share2, Copy, Check, Crown, Trash2, Link as LinkIcon, Users, Edit2 } from 'lucide-react';
import Modal from '../Modal';
import { TripUser } from '../../types';
import { ToastType } from '../Toast';
import { useTrip } from '../../context/TripContext';
import { TripService } from '../../services/tripService';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type?: ToastType) => void;
  initialTab?: 'members' | 'share';
}

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300', 
    'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300', 
    'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300', 
    'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300', 
    'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300', 
    'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-300',
    'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300',
    'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
    'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export default function GroupModal({ isOpen, onClose, showToast, initialTab = 'members' }: GroupModalProps) {
  const { tripData, currentUser, actions } = useTrip();

  const [activeTab, setActiveTab] = useState<'members' | 'share'>(initialTab);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  if (!tripData) return null;
  const shareUrl = `${window.location.origin}/?join=${tripData.id}`;

  useEffect(() => {
    if (isOpen) {
        setActiveTab(initialTab);
        setEditingUserId(null); 
    }
  }, [isOpen, initialTab]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(tripData.id);
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
    if (!window.confirm(`Segur que vols eliminar a ${userName} del grup?`)) return;
    setLoadingAction(userId);
    const res = await actions.leaveTrip(userId, 0, false); 
    if (res.success) showToast(`${userName} eliminat`, 'success');
    else showToast(res.error || "Error", 'error');
    setLoadingAction(null);
  };

  const handleClaimUser = async (tripUserId: string) => {
    if (!currentUser) return;
    if (!window.confirm("Aquest usuari ets tu?")) return;
    
    setLoadingAction(tripUserId);
    try {
        await TripService.linkUserToAccount(tripData.id, tripUserId, currentUser);
        showToast("Perfil vinculat!", 'success');
    } catch (error) {
        showToast("Error en vincular", 'error');
    } finally {
        setLoadingAction(null);
    }
  };

  const handleSaveName = async () => {
    if (!editingUserId || !tempName.trim()) return;
    setLoadingAction(editingUserId);
    try {
        // CORRECCIÓ: Fem servir el nom correcte del mètode del servei
        await TripService.updateTripUserName(tripData.id, editingUserId, tempName.trim());
        showToast("Nom actualitzat", 'success');
        setEditingUserId(null);
    } catch (error) {
        showToast("Error al canviar el nom", 'error');
    } finally {
        setLoadingAction(null);
    }
  };

  const activeUsers = tripData.users.filter(u => !u.isDeleted);
  const adminId = activeUsers.length > 0 ? activeUsers[0].id : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestió del Grup">
      
      {/* PESTANYES */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 mb-6 transition-colors">
        <button onClick={() => setActiveTab('members')} className={`flex-1 pb-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'members' ? 'text-indigo-600 border-b-2 border-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'}`}>
            <Users size={16}/> Membres
        </button>
        <button onClick={() => setActiveTab('share')} className={`flex-1 pb-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'share' ? 'text-indigo-600 border-b-2 border-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'}`}>
            <Share2 size={16}/> Compartir
        </button>
      </div>

      <div className="min-h-[350px]">
          {activeTab === 'share' ? (
            <div className="flex flex-col items-center gap-6 py-2 animate-fade-in">
                <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden">
                    <QRCode value={shareUrl} size={150} />
                </div>
                <div className="w-full space-y-4">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                        <p className="text-[10px] font-black text-indigo-500 dark:text-indigo-300 uppercase tracking-widest mb-3">Enllaç d'invitació</p>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-white dark:bg-slate-800 px-3 py-2.5 rounded-xl text-sm text-slate-600 dark:text-indigo-200 border border-slate-100 dark:border-slate-700 truncate">
                                {shareUrl}
                            </div>
                            <button onClick={handleCopyLink} className={`px-4 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm ${copiedLink ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                                {copiedLink ? <Check size={18} /> : <LinkIcon size={18} />}
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Codi de Grup</p>
                            <p className="font-mono font-bold text-slate-700 dark:text-white tracking-wider text-xl">{tripData.id}</p>
                        </div>
                        <button onClick={handleCopyCode} className="text-indigo-600 dark:text-indigo-400 p-2.5 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
                            {copiedCode ? <Check size={20}/> : <Copy size={20}/>}
                        </button>
                    </div>
                </div>
            </div>
          ) : (
            <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-4 px-1">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{activeUsers.length} Participants actius</p>
                </div>
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                    {activeUsers.map((u: TripUser) => {
                        const avatarClass = u.photoUrl ? 'bg-white' : getAvatarColor(u.name);
                        const isLinked = !!u.linkedUid;
                        const isMe = currentUser && u.linkedUid === currentUser.uid;

                        return (
                            <div key={u.id} className="group flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold border border-slate-100 dark:border-slate-700 overflow-hidden shrink-0 ${avatarClass}`}>
                                        {u.photoUrl ? <img src={u.photoUrl} alt={u.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : u.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            {editingUserId === u.id ? (
                                                <div className="flex items-center gap-1">
                                                    <input 
                                                        type="text" 
                                                        value={tempName} 
                                                        autoFocus 
                                                        onChange={(e) => setTempName(e.target.value)} 
                                                        className="border-b-2 border-indigo-500 outline-none text-sm font-bold text-indigo-700 dark:text-indigo-400 w-32 bg-transparent px-1" 
                                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingUserId(null); }} 
                                                    />
                                                    <button onClick={handleSaveName} className="text-emerald-500 p-1"><Check size={14}/></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <p className={`font-bold text-sm truncate ${isMe ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                                        {u.name} {isMe && '(Tu)'}
                                                    </p>
                                                    {u.id === adminId && <Crown size={12} className="text-amber-500 fill-amber-500 shrink-0" />}
                                                    {(isMe || !u.linkedUid) && (
                                                        <button 
                                                            onClick={() => { setEditingUserId(u.id); setTempName(u.name); }} 
                                                            className="text-slate-300 hover:text-indigo-600 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                            {isLinked ? 'Usuari Verificat' : 'Perfil Convidat'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {!isLinked && currentUser && (
                                        <button 
                                            onClick={() => handleClaimUser(u.id)} 
                                            disabled={!!loadingAction} 
                                            className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
                                        >
                                            Sóc jo
                                        </button>
                                    )}
                                    {!isMe && (
                                        <button 
                                            onClick={() => handleRemoveUser(u.id, u.name)} 
                                            disabled={!!loadingAction} 
                                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                                        >
                                            <Trash2 size={18} />
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