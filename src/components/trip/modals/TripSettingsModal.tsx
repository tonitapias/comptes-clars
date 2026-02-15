import React, { useState, useEffect, useRef } from 'react';
import { Lock, Download, Pencil, Check, X, Trash2 } from 'lucide-react'; 
import Modal from '../../Modal';
import Button from '../../Button';
import Avatar from '../../Avatar'; // Import correcte del nou component
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
  onDeleteTrip?: () => Promise<void>;
}

export default function TripSettingsModal({
  isOpen, onClose, tripData, canChangeCurrency, onUpdateSettings, onDeleteTrip
}: TripSettingsModalProps) {
  const [name, setName] = useState(tripData?.name || '');
  const [date, setDate] = useState('');
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // useRef per mantenir els canvis locals mentre Firebase es sincronitza
  // Això evita que l'Avatar "salti" a l'estat anterior just després de guardar
  const pendingUpdates = useRef<Record<string, string>>({});

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
    // Permetem espais al final (no fem trim aquí per UX) però si està buit no fem res
    if (!editNameValue || !editNameValue.trim()) return;
    
    if (!tripData?.id) {
        console.error("No s'ha trobat l'ID del viatge");
        return;
    }

    setIsUpdatingUser(true);
    
    // Guardem l'estat optimista
    pendingUpdates.current[userId] = editNameValue;

    try {
        await TripService.updateTripUserName(tripData.id, userId, editNameValue);
        setEditingUserId(null);
    } catch (error) {
        console.error("Error canviant nom:", error);
        // Si falla, esborrem l'optimista
        delete pendingUpdates.current[userId];
    } finally {
        setIsUpdatingUser(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!onDeleteTrip) return;
    
    if (confirm("Estàs segur que vols eliminar aquest projecte? Desapareixerà de la teva llista.")) {
      try {
        await onDeleteTrip();
        onClose(); 
      } catch (error) {
        console.error("Error eliminant el projecte:", error);
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
                {tripData.users.map(user => {
                    const isEditing = editingUserId === user.id;
                    // Lògica de visualització prioritària: Edició > Pendent > Firebase
                    const displayName = isEditing 
                        ? editNameValue 
                        : (pendingUpdates.current[user.id] || user.name);

                    // Forcem feedback visual: Si editem o hi ha canvi pendent, ignorem la foto antiga
                    const displayPhoto = (isEditing || pendingUpdates.current[user.id]) 
                        ? null 
                        : user.photoUrl;

                    return (
                        <div key={user.id} className="p-3 border-b border-slate-100 dark:border-slate-700 last:border-0 flex items-center gap-3">
                            <Avatar 
                                name={displayName} 
                                photoUrl={displayPhoto} 
                                size="sm"
                                className="transition-all duration-300"
                            />
                            
                            <div className="flex-1">
                                {isEditing ? (
                                    <div className="flex items-center gap-2 animate-fade-in">
                                        <input 
                                            type="text" 
                                            value={editNameValue}
                                            onChange={(e) => setEditNameValue(e.target.value)}
                                            className="flex-1 px-2 py-1 text-sm rounded border border-indigo-300 focus:border-indigo-500 outline-none dark:bg-slate-900 dark:text-white"
                                            autoFocus
                                            disabled={isUpdatingUser}
                                            placeholder="Nom"
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
                                            {displayName} {user.linkedUid === auth.currentUser?.uid && <span className="text-slate-400 font-normal">(Tu)</span>}
                                        </span>
                                        <button 
                                            onClick={() => {
                                                setEditingUserId(user.id);
                                                setEditNameValue(user.name); // Inicialitzem amb el nom actual
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
                    );
                })}
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

        {/* ZONA DE PERILL */}
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