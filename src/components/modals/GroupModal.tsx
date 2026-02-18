import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Share2, Copy, Check, Crown, Trash2, Link as LinkIcon, Users, Edit2, UserCheck } from 'lucide-react';
import Modal from '../Modal';
import Avatar from '../Avatar'; 
import { TripUser } from '../../types';
import { ToastType } from '../Toast';
import { useTrip } from '../../context/TripContext';
import { TripService } from '../../services/tripService';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type?: ToastType) => void;
  initialTab?: 'members' | 'share';
}

export default function GroupModal({ isOpen, onClose, showToast, initialTab = 'members' }: GroupModalProps) {
  const { tripData, currentUser, actions } = useTrip();
  const { trigger } = useHapticFeedback();

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
    trigger('success');
    navigator.clipboard.writeText(tripData.id);
    setCopiedCode(true);
    showToast("Codi copiat!", 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    trigger('success');
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    showToast("Enllaç copiat!", 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    trigger('medium'); // CORREGIT: 'warning' -> 'medium'
    if (!window.confirm(`Segur que vols eliminar a ${userName} del grup?`)) return;
    setLoadingAction(userId);
    const res = await actions.leaveTrip(userId, 0, false); 
    if (res.success) showToast(`${userName} eliminat`, 'success');
    else showToast(res.error || "Error", 'error');
    setLoadingAction(null);
  };

  const handleClaimUser = async (tripUserId: string) => {
    trigger('heavy'); // CORREGIT: 'impact' -> 'heavy'
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
    trigger('success');
    setLoadingAction(editingUserId);
    try {
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
      
      {/* --- SEGMENTED CONTROL TABS --- */}
      <div className="bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl flex relative mb-8 border border-slate-200 dark:border-slate-800">
        <button 
            onClick={() => { trigger('light'); setActiveTab('members'); }} 
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 relative z-10 ${activeTab === 'members' ? 'text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'}`}
        >
            <Users size={16} strokeWidth={2.5}/> Membres
        </button>
        <button 
            onClick={() => { trigger('light'); setActiveTab('share'); }} 
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 relative z-10 ${activeTab === 'share' ? 'text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'}`}
        >
            <Share2 size={16} strokeWidth={2.5}/> Compartir
        </button>
        
        {/* Sliding Background */}
        <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white dark:bg-slate-800 rounded-xl transition-all duration-300 ease-out shadow-sm ${activeTab === 'share' ? 'left-[calc(50%+3px)]' : 'left-1.5'}`} />
      </div>

      <div className="min-h-[350px]">
          {activeTab === 'share' ? (
            <div className="flex flex-col items-center gap-6 py-2 animate-fade-in">
                
                {/* QR CARD */}
                <div className="relative group perspective">
                    <div className="absolute inset-0 bg-indigo-500/30 blur-2xl rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-700" />
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 relative z-10 transform transition-transform duration-500 hover:scale-105 hover:rotate-1">
                        <QRCode value={shareUrl} size={160} fgColor="#1e293b" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 rounded-[2rem] backdrop-blur-sm">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-widest">Escaneja'm</span>
                        </div>
                    </div>
                </div>

                <div className="w-full space-y-4">
                    {/* Share Link Card */}
                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-800/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none" />
                        
                        <div className="flex justify-between items-center mb-2">
                             <p className="text-[10px] font-black text-indigo-400 dark:text-indigo-300 uppercase tracking-widest">Enllaç d'invitació</p>
                             <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        </div>
                        
                        <div className="flex gap-2">
                            <div className="flex-1 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm px-4 py-3 rounded-2xl text-xs font-mono text-slate-600 dark:text-indigo-200 border border-indigo-100/50 dark:border-indigo-800/50 truncate">
                                {shareUrl}
                            </div>
                            <button 
                                onClick={handleCopyLink} 
                                className={`px-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 ${copiedLink ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-indigo-600 text-white shadow-indigo-500/30'}`}
                            >
                                {copiedLink ? <Check size={20} strokeWidth={3} /> : <LinkIcon size={20} strokeWidth={2.5} />}
                            </button>
                        </div>
                    </div>

                    {/* Group Code Card */}
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Codi de Grup</p>
                            <p className="font-mono font-black text-slate-800 dark:text-white tracking-widest text-2xl">{tripData.id}</p>
                        </div>
                        <button 
                            onClick={handleCopyCode} 
                            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-500 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all shadow-sm hover:shadow-md active:scale-90"
                        >
                            {copiedCode ? <Check size={20} strokeWidth={3} className="text-emerald-500"/> : <Copy size={20} strokeWidth={2.5}/>}
                        </button>
                    </div>
                </div>
            </div>
          ) : (
            <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-6 px-2">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {activeUsers.length} Participants actius
                    </p>
                </div>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar pb-4">
                    {activeUsers.map((u: TripUser, idx) => {
                        const isLinked = !!u.linkedUid;
                        const isMe = currentUser && u.linkedUid === currentUser.uid;

                        return (
                            <div 
                                key={u.id} 
                                className="group relative flex items-center justify-between bg-white dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-lg hover:border-slate-200 dark:hover:border-slate-700 hover:-translate-y-0.5"
                                style={{ animationDelay: `${idx * 50}ms` }}
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <Avatar name={u.name} photoUrl={u.photoUrl} size="md" className="ring-4 ring-slate-50 dark:ring-slate-800" />
                                    
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            {editingUserId === u.id ? (
                                                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                                                    <input 
                                                        type="text" 
                                                        value={tempName} 
                                                        autoFocus 
                                                        onChange={(e) => setTempName(e.target.value)} 
                                                        className="bg-transparent border-none outline-none text-sm font-bold text-slate-800 dark:text-white w-28 px-1" 
                                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingUserId(null); }} 
                                                    />
                                                    <button onClick={handleSaveName} className="bg-emerald-500 text-white rounded-md p-0.5 hover:scale-110 transition-transform"><Check size={14} strokeWidth={3}/></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <p className={`font-bold text-sm truncate ${isMe ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                                        {u.name} {isMe && '(Tu)'}
                                                    </p>
                                                    
                                                    {u.id === adminId && (
                                                        <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 p-0.5 rounded-md" title="Admin">
                                                            <Crown size={10} strokeWidth={3} />
                                                        </span>
                                                    )}
                                                    
                                                    {(isMe || !u.linkedUid) && (
                                                        <button 
                                                            onClick={() => { trigger('selection'); setEditingUserId(u.id); setTempName(u.name); }} 
                                                            className="text-slate-300 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Edit2 size={12} strokeWidth={2.5} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center gap-1.5">
                                            {isLinked ? (
                                                <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-md">
                                                    <UserCheck size={10} strokeWidth={3} /> Verificat
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                                                    Convidat
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {!isLinked && currentUser && (
                                        <button 
                                            onClick={() => handleClaimUser(u.id)} 
                                            disabled={!!loadingAction} 
                                            className="relative overflow-hidden px-4 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 active:scale-95 transition-all"
                                        >
                                            <span className="relative z-10">Sóc jo</span>
                                        </button>
                                    )}
                                    {!isMe && (
                                        <button 
                                            onClick={() => handleRemoveUser(u.id, u.name)} 
                                            disabled={!!loadingAction} 
                                            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30 transition-all"
                                            title="Eliminar del grup"
                                        >
                                            <Trash2 size={16} strokeWidth={2.5} />
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