import React, { useState } from 'react';
import { Trash2, Edit2, Check, X, UserCheck, Fingerprint, Copy } from 'lucide-react';
import Modal from '../Modal';
import Button from '../Button';
import { TripData, TripUser } from '../../types';
import { ToastType } from '../Toast';
import { auth } from '../../config/firebase';
import { TripService } from '../../services/tripService'; // Importem el servei correcte

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: TripData; // Esperem l'objecte Trip sencer
  showToast: (msg: string, type?: ToastType) => void;
  // Aquestes props ja no calen perquè cridem al servei directament, però les deixem per compatibilitat si cal
  onAddUser?: any; onRemoveUser?: any; onRenameUser?: any; 
}

export default function GroupModal({ isOpen, onClose, trip, showToast }: GroupModalProps) {
  const [newUserName, setNewUserName] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [copied, setCopied] = useState(false);
  
  const currentUser = auth.currentUser;

  const copyCode = () => {
    navigator.clipboard.writeText(trip.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast("Codi copiat!", 'success');
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    try {
      await TripService.addUser(trip.id, newUserName.trim());
      setNewUserName('');
      showToast("Participant afegit", 'success');
    } catch (error) {
      showToast("Error afegint participant", 'error');
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm("Segur que vols eliminar aquest participant?")) return;
    try {
      await TripService.removeUser(trip.id, userId);
      showToast("Participant eliminat", 'success');
    } catch (error) {
      showToast("No es pot eliminar si té despeses", 'error');
    }
  };

  const startEditing = (user: TripUser) => {
    setEditingUserId(user.id);
    setEditingName(user.name);
  };

  const saveEditing = async () => {
    if (!editingUserId || !editingName.trim()) return;
    try {
      await TripService.renameUser(trip.id, editingUserId, editingName.trim());
      setEditingUserId(null);
      showToast("Nom actualitzat", 'success');
    } catch (error) {
      showToast("Error canviant el nom", 'error');
    }
  };

  const handleLinkProfile = async (user: TripUser) => {
      if (!currentUser) return showToast("Inicia sessió primer", 'error');
      if (confirm(`Vols vincular el teu compte i foto al perfil "${user.name}"?`)) {
          try {
              await TripService.linkUserToProfile(trip.id, user.id, currentUser.uid, currentUser.photoURL);
              showToast("Perfil vinculat correctament!", 'success');
          } catch (error) {
              console.error(error);
              showToast("Error vinculant perfil", 'error');
          }
      }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestió del Grup">
      <div className="space-y-6">
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex justify-between items-center">
          <span className="font-mono text-xl font-bold tracking-widest text-indigo-900">{trip.id}</span>
          <button onClick={copyCode} className={`text-indigo-600 bg-white p-2 rounded-lg shadow-sm transition-all ${copied ? 'bg-emerald-100 text-emerald-600' : ''}`}>
            {copied ? <Check size={16}/> : <Copy size={16}/>}
          </button>
        </div>

        <form onSubmit={handleAddUser} className="flex gap-2">
          <input type="text" placeholder="Nom del nou participant..." className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
          <Button type="submit">Afegir</Button>
        </form>

        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase flex justify-between">
              <span>Participants ({trip.users.length})</span>
              {!currentUser && <span className="text-amber-500 text-[10px] normal-case">Inicia sessió per vincular-te</span>}
          </h3>
          
          {trip.users.map(u => {
            const isMe = currentUser && u.linkedUid === currentUser.uid;
            return (
                <div key={u.id} className={`flex items-center justify-between p-3 rounded-xl border shadow-sm transition-colors ${isMe ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100'}`}>
                {editingUserId === u.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                        <input type="text" autoFocus className="flex-1 p-1 border-b-2 border-indigo-500 outline-none bg-transparent font-bold text-slate-700" value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                        <button onClick={saveEditing} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={18}/></button>
                        <button onClick={() => setEditingUserId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X size={18}/></button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden ${isMe ? 'bg-indigo-600 text-white' : (u.isAuth ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500')}`}>
                            {u.photoUrl ? <img src={u.photoUrl} className="w-full h-full object-cover" /> : u.name.charAt(0)}
                        </div>
                        <div className="flex flex-col truncate">
                            <span className={`font-medium truncate ${isMe ? 'text-indigo-700' : 'text-slate-700'}`}>{u.name} {isMe && '(Tu)'}</span>
                            {u.isAuth && !isMe && <span className="text-[10px] text-emerald-600 flex items-center gap-0.5"><UserCheck size={10}/> Verificat</span>}
                        </div>
                    </div>
                )}
                <div className="flex gap-1 items-center">
                    {currentUser && !u.linkedUid && !editingUserId && (
                        <button onClick={() => handleLinkProfile(u)} title="Aquest sóc jo" className="mr-2 px-2 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 flex items-center gap-1"><Fingerprint size={14}/> Sóc jo</button>
                    )}
                    {!editingUserId && <button onClick={() => startEditing(u)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>}
                    <button onClick={() => handleRemoveUser(u.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                </div>
                </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}