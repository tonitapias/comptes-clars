import React, { useState } from 'react';
import { Plus, Check, Copy, Edit2, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import Button from '../Button';
import Modal from '../Modal';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  users: string[];
  onAddUser: (name: string) => Promise<void>;
  onRemoveUser: (name: string) => void;
  onRenameUser: (oldName: string, newName: string) => Promise<void>;
}

export default function GroupModal({ isOpen, onClose, tripId, users, onAddUser, onRemoveUser, onRenameUser }: GroupModalProps) {
  const [newUserName, setNewUserName] = useState('');
  const [editingUser, setEditingUser] = useState<{ oldName: string, newName: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(tripId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAdd = async () => {
    const cleanName = newUserName.trim();
    const exists = users.some(u => u.toLowerCase() === cleanName.toLowerCase());
    
    if (cleanName && !exists) {
      setIsSubmitting(true);
      try {
        await onAddUser(cleanName);
        setNewUserName('');
      } finally {
        setIsSubmitting(false);
      }
    } else if (exists) {
      alert("Aquest usuari ja existeix!");
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser && editingUser.newName) {
       const cleanName = editingUser.newName.trim();
       const exists = users.some(u => u.toLowerCase() === cleanName.toLowerCase() && u !== editingUser.oldName);
       
       if (!exists && cleanName) {
         setIsSubmitting(true);
         try {
            await onRenameUser(editingUser.oldName, cleanName);
            setEditingUser(null);
         } finally {
            setIsSubmitting(false);
         }
       } else if (exists) {
         alert("Ja existeix un usuari amb aquest nom");
       }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestionar Grup">
      <div className="space-y-6">
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-4 flex justify-between items-center">
          <span className="font-mono text-xl font-bold tracking-widest text-indigo-900">{tripId}</span>
          <button onClick={copyCode} className={`text-indigo-600 bg-white p-2 rounded-lg shadow-sm transition-all ${copied ? 'bg-emerald-100 text-emerald-600' : ''}`}>
            {copied ? <Check size={16}/> : <Copy size={16}/>}
          </button>
        </div>

        <div className="space-y-2">
          {users.map(u => (
            <div key={u} className="flex justify-between items-center bg-white border border-slate-100 p-3 rounded-xl">
              {editingUser?.oldName === u ? (
                <form onSubmit={handleRenameSubmit} className="flex gap-2 w-full items-center">
                  <input autoFocus type="text" className="flex-1 bg-slate-50 px-2 py-1 rounded border border-indigo-300 outline-none" value={editingUser.newName} onChange={e => setEditingUser({...editingUser, newName: e.target.value})} disabled={isSubmitting}/>
                  <button type="submit" className="text-emerald-600 p-1" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 size={18} className="animate-spin text-indigo-500"/> : <CheckCircle2 size={18}/>}
                  </button>
                </form>
              ) : (
                <>
                  <span className="font-bold text-slate-700">{u}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingUser({ oldName: u, newName: u })} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={14}/></button>
                    <button onClick={() => onRemoveUser(u)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-100 flex gap-2">
          <input type="text" placeholder="Nom..." className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} disabled={isSubmitting} onKeyDown={(e) => e.key === 'Enter' && handleAdd()}/>
          <Button variant="secondary" onClick={handleAdd} icon={isSubmitting ? undefined : Plus} disabled={!newUserName.trim() || isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : "Afegir"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}