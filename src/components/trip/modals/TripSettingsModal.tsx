// FITXER: src/components/trip/modals/TripSettingsModal.tsx

import React, { useState, useEffect } from 'react';
import { Lock, Download, Pencil, Check, X, User as UserIcon, Trash2 } from 'lucide-react'; 
import Modal from '../../Modal';
import Button from '../../Button';
import { CURRENCIES } from '../../../utils/constants';
import { TripData, Currency } from '../../../types';
import { downloadBackup } from '../../../utils/exportData';
import { TripService } from '../../../services/tripService'; 
import { auth } from '../../../config/firebase'; 

interface TripSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripData: TripData;
  canChangeCurrency: boolean;
  onUpdateSettings: (name: string, date: string, currency?: Currency) => Promise<boolean>;
  onDeleteTrip?: () => Promise<void>; // <--- NOVA PROPIETAT OPCIONAL
}

export default function TripSettingsModal({
  isOpen, onClose, tripData, canChangeCurrency, onUpdateSettings, onDeleteTrip
}: TripSettingsModalProps) {
  const [name, setName] = useState(tripData?.name || '');
  const [date, setDate] = useState('');
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  useEffect(() => {
    if (tripData) {
      setName(tripData.name);
      setDate(tripData.createdAt ? tripData.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);
    }
  }, [tripData, isOpen]);

  const handleSave = async () => {
    const success = await onUpdateSettings(name, date);
    if (success) onClose();
  };

  const handleUpdateUserName = async (userId: string) => {
    if (!editNameValue.trim()) return;
    setIsUpdatingUser(true);
    try {
        await TripService.updateTripUserName(tripData.id, userId, editNameValue);
        setEditingUserId(null);
    } catch (error) {
        console.error("Error canviant nom:", error);
        alert("No s'ha pogut canviar el nom");
    } finally {
        setIsUpdatingUser(false);
    }
  };

  // Funció pel botó d'eliminar
  const handleDeleteClick = async () => {
    if (!onDeleteTrip) return;
    
    if (confirm("Estàs segur que vols eliminar aquest projecte? Desapareixerà de la teva llista.")) {
      try {
        await onDeleteTrip();
        onClose(); // Tanquem el modal
        // La redirecció l'hauria de gestionar el hook o la pàgina principal en detectar l'esborrat
      } catch (error) {
        alert("Error eliminant el projecte");
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configuració del Projecte">
      <div className="space-y-6">
        
        {/* CONFIGURACIÓ GENERAL */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom del projecte</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-bold text-slate-700 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data d'inici</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-bold text-slate-700 dark:text-white"
            />
          </div>
        </div>

        {/* --- LLISTAT PARTICIPANTS --- */}
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Participants</label>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                {tripData.users.map(user => (
                    <div key={user.id} className="p-3 border-b border-slate-100 dark:border-slate-700 last:border-0 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                             {user.photoUrl ? (
                                <img src={user.photoUrl} alt={user.name} className="w-full h-full rounded-full object-cover"/>
                             ) : (
                                <UserIcon size={16}/>
                             )}
                        </div>
                        
                        <div className="flex-1">
                            {editingUserId === user.id ? (
                                <div className="flex items-center gap-2 animate-fade-in">
                                    <input 
                                        type="text" 
                                        value={editNameValue}
                                        onChange={(e) => setEditNameValue(e.target.value)}
                                        className="flex-1 px-2 py-1 text-sm rounded border border-indigo-300 focus:border-indigo-500 outline-none dark:bg-slate-900 dark:text-white"
                                        autoFocus
                                        disabled={isUpdatingUser}
                                    />
                                    <button 
                                        onClick={() => handleUpdateUserName(user.id)}
                                        disabled={isUpdatingUser}
                                        className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                                    >
                                        <Check size={14} />
                                    </button>
                                    <button 
                                        onClick={() => setEditingUserId(null)}
                                        disabled={isUpdatingUser}
                                        className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between group">
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        {user.name} {user.linkedUid === auth.currentUser?.uid && <span className="text-slate-400 font-normal">(Tu)</span>}
                                    </span>
                                    <button 
                                        onClick={() => {
                                            setEditingUserId(user.id);
                                            setEditNameValue(user.name);
                                        }}
                                        className="opacity-100 md:opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-indigo-600 transition-all rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                        title="Canviar nom"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* SELECCIÓ DE DIVISA */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-xs font-bold text-slate-500 uppercase">Divisa</label>
            {!canChangeCurrency && <Lock size={12} className="text-slate-400" />}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {CURRENCIES.map(c => (
              <button
                key={c.code}
                onClick={() => canChangeCurrency && onUpdateSettings(name, date, c)}
                disabled={!canChangeCurrency}
                className={`p-3 rounded-xl border-2 text-sm font-bold flex justify-center gap-2 transition-colors
                  ${tripData.currency.code === c.code ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-slate-100 dark:border-slate-700 dark:text-slate-400'} 
                  ${!canChangeCurrency && tripData.currency.code !== c.code ? 'opacity-40 cursor-not-allowed' : 'hover:border-indigo-200'}`}
              >
                <span>{c.symbol}</span> {c.code}
              </button>
            ))}
          </div>
          {!canChangeCurrency && (
            <p className="text-[10px] text-slate-400 mt-1.5">
              * No es pot canviar la divisa perquè ja hi ha despeses registrades.
            </p>
          )}
        </div>

        {/* CÒPIA DE SEGURETAT */}
        <div>
           <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Còpia de Seguretat</label>
           <button 
             onClick={() => downloadBackup(tripData)}
             className="w-full p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-200 dark:border-slate-700"
           >
             <Download size={18} />
             Descarregar JSON
           </button>
        </div>

        {/* --- ZONA DE PERILL (ELIMINAR PROJECTE) --- */}
        {onDeleteTrip && (
            <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
            <label className="block text-xs font-bold text-red-500 uppercase mb-2">Zona de Perill</label>
            <button 
                onClick={handleDeleteClick}
                className="w-full p-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-red-100 dark:border-red-900/50"
            >
                <Trash2 size={18} />
                Eliminar Projecte
            </button>
            </div>
        )}

        <Button onClick={handleSave}>Guardar canvis</Button>
      </div>
    </Modal>
  );
}