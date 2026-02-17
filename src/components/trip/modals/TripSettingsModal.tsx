import { useState, useEffect } from 'react';
import { 
  Lock, Download, Pencil, Check, X, Trash2, 
  Calendar, Users, ShieldAlert, Save, AlertTriangle, LogOut 
} from 'lucide-react'; 
import Modal from '../../Modal';
import Button from '../../Button';
import Avatar from '../../Avatar'; 
import { CURRENCIES } from '../../../utils/constants';
import { TripData, Currency, TripUser } from '../../../types';
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
  onLeaveTrip?: () => Promise<void>;
}

export default function TripSettingsModal({
  isOpen, onClose, tripData, canChangeCurrency, onUpdateSettings, onDeleteTrip, onLeaveTrip
}: TripSettingsModalProps) {
  
  const [name, setName] = useState(tripData?.name || '');
  const [date, setDate] = useState(tripData?.createdAt ? tripData.createdAt.split('T')[0] : ''); 
  const [currency, setCurrency] = useState<Currency>(tripData?.currency || CURRENCIES[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localUsers, setLocalUsers] = useState<TripUser[]>(tripData.users || []);

  useEffect(() => {
    if (tripData) {
        setLocalUsers(tripData.users);
        setName(tripData.name);
        setDate(tripData.createdAt ? tripData.createdAt.split('T')[0] : '');
        setCurrency(tripData.currency);
    }
  }, [tripData, isOpen]);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  const startEditUser = (user: TripUser) => {
    setEditingUserId(user.id);
    setEditNameValue(user.name);
  };

  const saveUserEdit = async (userId: string) => {
    if (!editNameValue.trim()) return;
    
    const previousUsers = [...localUsers];
    const updatedUsers = localUsers.map(u => 
        u.id === userId ? { ...u, name: editNameValue.trim(), photoUrl: null } : u 
    );
    setLocalUsers(updatedUsers);
    setEditingUserId(null); 
    setIsUpdatingUser(true);

    try {
      await TripService.updateTripUserName(tripData.id, userId, editNameValue.trim());
    } catch (error) {
      console.error("Error updating user:", error);
      setLocalUsers(previousUsers); 
      alert("Error al guardar el nom. Comprova la connexió.");
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Segur que vols eliminar aquest participant del grup?")) return;
    
    const previousUsers = [...localUsers];
    setLocalUsers(localUsers.filter(u => u.id !== userId));
    setIsUpdatingUser(true);

    try {
      await TripService.leaveTrip(tripData.id, userId);
    } catch (error) {
      console.error("Error removing user:", error);
      setLocalUsers(previousUsers); 
      alert("No es pot eliminar l'usuari.");
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const success = await onUpdateSettings(name, date, canChangeCurrency ? currency : undefined);
      if (success) onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [showDangerConfirm, setShowDangerConfirm] = useState(false);
  const isOwner = auth.currentUser?.uid === tripData.ownerId;
  const hasDeletePermission = isOwner && !!onDeleteTrip;
  const hasLeaveOption = !!onLeaveTrip;
  const showDangerZone = hasDeletePermission || hasLeaveOption;

  const handleDangerAction = async () => {
      if (hasDeletePermission && onDeleteTrip) {
          await onDeleteTrip();
      } else if (hasLeaveOption && onLeaveTrip) {
          await onLeaveTrip();
      }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configuració del Viatge">
      <div className="space-y-8 pb-4">
        
        {/* HERO SECTION */}
        <div className="bg-slate-50 dark:bg-slate-900/50 -mx-6 -mt-2 px-6 py-8 border-b border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4">
            <div className="w-full relative group">
                <label className="sr-only">Nom del viatge</label>
                <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-center bg-transparent border-none outline-none text-3xl font-black text-slate-800 dark:text-slate-100 placeholder:text-slate-300 focus:placeholder:text-indigo-300 transition-all"
                    placeholder="Nom del viatge..."
                />
                <Pencil size={16} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="h-1 w-12 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-2 group-focus-within:bg-indigo-500 group-focus-within:w-1/2 transition-all duration-300 ease-out" />
            </div>
        </div>

        {/* SETTINGS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                    <Calendar size={14} /> Data d'inici
                </label>
                <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-700 dark:text-slate-200 transition-all"
                />
            </div>

            <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                    Moneda Principal
                </label>
                <div className="relative">
                    <select 
                        value={currency.code}
                        onChange={(e) => {
                            const c = CURRENCIES.find(cur => cur.code === e.target.value);
                            if (c) setCurrency(c);
                        }}
                        disabled={!canChangeCurrency}
                        className={`
                            w-full p-3.5 appearance-none rounded-xl border font-bold outline-none transition-all
                            ${!canChangeCurrency 
                                ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed pr-10' 
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'}
                        `}
                    >
                        {CURRENCIES.map(c => (
                            <option key={c.code} value={c.code}>{c.name} ({c.symbol})</option>
                        ))}
                    </select>
                    {!canChangeCurrency && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <Lock size={16} />
                        </div>
                    )}
                </div>
                {!canChangeCurrency && (
                    <p className="text-[10px] text-orange-500/80 font-medium pl-1 flex items-center gap-1">
                        <AlertTriangle size={10} />
                        No es pot canviar amb despeses creades
                    </p>
                )}
            </div>
        </div>

        {/* GESTIÓ PARTICIPANTS */}
        <div className="space-y-3">
             <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Users size={14} /> Participants
                </label>
                <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500">
                    {localUsers.length}
                </span>
             </div>
             
             <div className="bg-slate-50 dark:bg-slate-900/30 rounded-[1.5rem] p-2 space-y-2 border border-slate-100 dark:border-slate-800/50">
                {localUsers.map(user => (
                    <div key={user.id} className="group flex items-center justify-between p-2 pl-3 bg-white dark:bg-slate-800 rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm transition-all">
                        
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar name={user.name} photoUrl={user.photoUrl} size="sm" />
                            
                            {editingUserId === user.id ? (
                                <input 
                                    type="text" 
                                    autoFocus
                                    value={editNameValue}
                                    onChange={(e) => setEditNameValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveUserEdit(user.id);
                                        if (e.key === 'Escape') setEditingUserId(null);
                                    }}
                                    className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-800 dark:text-slate-100"
                                    disabled={isUpdatingUser}
                                />
                            ) : (
                                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">{user.name}</span>
                            )}
                        </div>

                        <div className="flex items-center gap-1 pl-2">
                            {editingUserId === user.id ? (
                                <>
                                    <button 
                                        onClick={() => saveUserEdit(user.id)} 
                                        disabled={isUpdatingUser} 
                                        className="h-8 w-8 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 transition-colors"
                                    >
                                        <Check size={16} strokeWidth={3} />
                                    </button>
                                    <button 
                                        onClick={() => setEditingUserId(null)} 
                                        disabled={isUpdatingUser} 
                                        className="h-8 w-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200 transition-colors"
                                    >
                                        <X size={16} strokeWidth={3} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button 
                                        onClick={() => startEditUser(user)} 
                                        className="h-8 w-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    
                                    {isOwner && user.id !== tripData.ownerId && (
                                        <button 
                                            onClick={() => deleteUser(user.id)}
                                            className="h-8 w-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ))}
             </div>
        </div>

        {/* EXTRA ACTIONS */}
        <div className="space-y-6 pt-4">
             <button 
                onClick={() => downloadBackup(tripData)}
                className="w-full group relative overflow-hidden bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-4 rounded-2xl flex items-center justify-between shadow-lg shadow-slate-200 dark:shadow-none hover:scale-[1.01] active:scale-[0.99] transition-all"
             >
                <div className="flex items-center gap-3 relative z-10">
                    <div className="p-2 bg-white/10 dark:bg-slate-900/10 rounded-xl">
                        <Download size={20} />
                    </div>
                    <div className="text-left">
                        <div className="font-bold text-sm">Còpia de Seguretat</div>
                        <div className="text-[10px] opacity-70">Descarregar JSON</div>
                    </div>
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
             </button>

            {showDangerZone && (
                <div className={`
                    rounded-3xl border transition-all duration-300 overflow-hidden
                    ${showDangerConfirm 
                        ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-900/30' 
                        : 'bg-transparent border-transparent'}
                `}>
                    {!showDangerConfirm ? (
                        <button 
                            onClick={() => setShowDangerConfirm(true)}
                            className="w-full flex items-center justify-center gap-2 p-4 text-rose-500 hover:text-rose-700 font-bold text-sm opacity-60 hover:opacity-100 transition-all hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-2xl"
                        >
                            {hasDeletePermission ? <Trash2 size={16} /> : <LogOut size={16} />} 
                            {hasDeletePermission ? 'Eliminar Viatge' : 'Deixar de veure el grup'}
                        </button>
                    ) : (
                        <div className="p-5 animate-in slide-in-from-bottom-2 fade-in">
                            <div className="flex flex-col items-center text-center gap-2 mb-4">
                                <div className="p-3 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full mb-1">
                                    <ShieldAlert size={24} />
                                </div>
                                <h4 className="text-rose-700 dark:text-rose-400 font-black text-lg">Estàs segur?</h4>
                                <p className="text-xs text-rose-600/70 max-w-[200px] leading-relaxed">
                                    {hasDeletePermission 
                                        ? "Aquesta acció és irreversible. S'esborraran totes les dades." 
                                        : "Deixaràs de tenir accés a aquest viatge."}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowDangerConfirm(false)}
                                    className="flex-1 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel·lar
                                </button>
                                <button 
                                    onClick={handleDangerAction}
                                    className="flex-1 py-3 bg-rose-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-700 active:scale-95 transition-all"
                                >
                                    {hasDeletePermission ? 'Sí, eliminar' : 'Sí, marxar'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-4">
            <Button 
                onClick={handleSave} 
                loading={isSubmitting} 
                fullWidth 
                className="h-14 text-lg"
                icon={Save}
                haptic="success"
            >
                Guardar Canvis
            </Button>
        </div>
      </div>
    </Modal>
  );
}