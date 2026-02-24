import { useState, useEffect } from 'react';
import { Trash2, Save, Type, AlertTriangle, Lock, Coins, LogOut } from 'lucide-react';
import Modal from '../../Modal';
import Button from '../../Button';
import { Currency } from '../../../types';
import { CURRENCIES } from '../../../utils/constants';
import { useTripMeta } from '../../../context/TripContext';
import { useHapticFeedback } from '../../../hooks/useHapticFeedback';

interface TripSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  canChangeCurrency: boolean;
  onUpdate: (name: string, currency: Currency) => Promise<boolean>;
  onDelete: () => Promise<void>; 
  onLeave: () => Promise<void>;  
}

export default function TripSettingsModal({ 
  isOpen, onClose, canChangeCurrency, onUpdate, onDelete, onLeave
}: TripSettingsModalProps) {
  const { tripData, currentUser } = useTripMeta();
  const { trigger } = useHapticFeedback();
  
  const [name, setName] = useState('');
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>('EUR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && tripData) {
      setName(tripData.name);
      setSelectedCurrencyCode(tripData.currency.code);
      setShowDeleteConfirm(false);
      setShowLeaveConfirm(false);
    }
  }, [isOpen, tripData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    trigger('success');
    setIsSubmitting(true);
    try {
      const currency = CURRENCIES.find(c => c.code === selectedCurrencyCode) || CURRENCIES[0];
      await onUpdate(name, currency);
      onClose();
    } catch (error) {
      console.error(error);
      trigger('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
      trigger('medium');
      setShowDeleteConfirm(true);
  };

  if (!tripData) return null;

  const isOwner = Boolean(
      currentUser?.uid && 
      tripData?.ownerId && 
      currentUser.uid === tripData.ownerId
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configuració">
      <div className="space-y-8 pt-4">
        
        <form id="settings-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-2"><Type size={12}/> Nom del Viatge</label>
                <div className="relative group">
                    <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="relative w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white font-bold text-lg py-4 px-5 rounded-2xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm placeholder:text-slate-300 dark:placeholder:text-slate-700" placeholder="Ex: Costa Brava 2024" />
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between pl-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2"><Coins size={12} /> Divisa Principal</label>
                    {!canChangeCurrency && (
                        <span className="flex items-center gap-1.5 text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            <Lock size={8} /> Bloquejat
                        </span>
                    )}
                </div>
                
                <div className="relative">
                    {!canChangeCurrency && (
                        <div className="absolute inset-0 z-20 cursor-not-allowed bg-slate-50/50 dark:bg-black/60 backdrop-blur-[2px] rounded-2xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300" onClick={() => trigger('error')}>
                            <span className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xl border border-slate-700">Canvi bloquejat per seguretat</span>
                        </div>
                    )}
                    
                    <div className={`grid grid-cols-3 gap-3 ${!canChangeCurrency ? 'opacity-50 grayscale' : ''}`}>
                        {CURRENCIES.map((curr) => {
                            const isSelected = selectedCurrencyCode === curr.code;
                            return (
                                <button
                                    key={curr.code} type="button" disabled={!canChangeCurrency} onClick={() => { trigger('selection'); setSelectedCurrencyCode(curr.code); }}
                                    className={`relative overflow-hidden flex flex-col items-center justify-center py-4 rounded-2xl border transition-all duration-300 group ${isSelected ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/40 scale-[1.02]' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'}`}
                                >
                                    {isSelected && <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />}
                                    <span className={`text-2xl font-black mb-1 ${isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>{curr.symbol}</span>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>{curr.code}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <Button type="submit" fullWidth loading={isSubmitting} disabled={name.trim() === ''} icon={Save} className="h-14 rounded-2xl text-base font-black uppercase tracking-wide bg-slate-900 dark:bg-white text-white dark:text-black shadow-xl hover:shadow-2xl transition-all">Guardar Configuració</Button>
        </form>

        <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-3">
            {showLeaveConfirm ? (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6 animate-fade-in-up">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 border border-amber-500/20"><LogOut size={24} strokeWidth={2.5} /></div>
                        <div>
                            <h4 className="font-bold text-amber-600 dark:text-amber-400 text-base">Sortir del viatge?</h4>
                            <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1 leading-relaxed max-w-[250px]">Deixaràs de tenir accés i <strong>no hi podràs tornar a entrar</strong> tret que el creador et torni a convidar.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setShowLeaveConfirm(false)} className="flex-1 py-3.5 bg-transparent border border-amber-200 dark:border-amber-900 rounded-xl text-amber-600 dark:text-amber-400 font-bold text-xs hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors">Cancel·lar</button>
                        <button type="button" onClick={() => { trigger('medium'); onLeave(); }} className="flex-1 py-3.5 bg-amber-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-amber-500/30 hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center gap-2"><LogOut size={16} /> Confirmar</button>
                    </div>
                </div>
            ) : (
                <button type="button" onClick={() => { trigger('selection'); setShowLeaveConfirm(true); }} className="w-full flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all group">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-amber-500 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/50 transition-colors"><LogOut size={20} /></div>
                        <div className="text-left"><span className="block text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">Sortir del Viatge</span></div>
                    </div>
                </button>
            )}

            {isOwner && (
                showDeleteConfirm ? (
                    <div className="bg-rose-500/5 border border-rose-500/20 rounded-3xl p-6 animate-fade-in-up">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500 border border-rose-500/20"><AlertTriangle size={24} strokeWidth={2.5} /></div>
                            <div>
                                <h4 className="font-bold text-rose-600 dark:text-rose-400 text-base">Eliminar Viatge?</h4>
                                <p className="text-xs text-rose-600/70 dark:text-rose-400/70 mt-1 leading-relaxed max-w-[250px]">Esborraràs <strong>totes les dades</strong> per a tots els usuaris. Irreversible.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3.5 bg-transparent border border-rose-200 dark:border-rose-900 rounded-xl text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors">Cancel·lar</button>
                            <button type="button" onClick={() => { trigger('heavy'); onDelete(); }} className="flex-1 py-3.5 bg-rose-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-500/30 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-2"><Trash2 size={16} /> Eliminar</button>
                        </div>
                    </div>
                ) : (
                    <button type="button" onClick={handleDeleteClick} className="w-full group relative overflow-hidden p-0.5 rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.99]">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        <div className="relative flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-rose-200 dark:group-hover:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-rose-500 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/50 transition-colors"><Trash2 size={20} /></div>
                                <div className="text-left">
                                    <span className="block text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-rose-700 dark:group-hover:text-rose-400 transition-colors">Eliminar Viatge</span>
                                    <span className="text-[10px] text-slate-400 group-hover:text-rose-500/70">Zona de perill</span>
                                </div>
                            </div>
                        </div>
                    </button>
                )
            )}
        </div>
      </div>
    </Modal>
  );
}