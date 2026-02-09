// FITXER: src/components/trip/modals/TripSettingsModal.tsx

import React, { useState, useEffect } from 'react';
import { Lock, LogOut, Download } from 'lucide-react'; // <--- 1. Importem la icona Download
import Modal from '../../Modal';
import Button from '../../Button';
import { CURRENCIES } from '../../../utils/constants';
import { TripData, Currency } from '../../../types';
import { downloadBackup } from '../../../utils/exportData'; // <--- 2. Importem la funció

interface TripSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripData: TripData;
  canChangeCurrency: boolean;
  onUpdateSettings: (name: string, date: string, currency?: Currency) => Promise<boolean>;
  onLeaveTrip: () => void;
}

export default function TripSettingsModal({
  isOpen, onClose, tripData, canChangeCurrency, onUpdateSettings, onLeaveTrip
}: TripSettingsModalProps) {
  const [name, setName] = useState(tripData?.name || '');
  const [date, setDate] = useState('');

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

  const handleCurrencyChange = async (c: Currency) => {
    if (canChangeCurrency) {
       await onUpdateSettings(name, date, c);
    }
  };

  if (!tripData) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configuració del Grup">
      <div className="space-y-6">
        {/* Camp NOM */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nom</label>
          <input 
            type="text" 
            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl" 
            value={name} 
            onChange={e => setName(e.target.value)} 
          />
        </div>

        {/* Camp DATA */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Data</label>
          <input 
            type="date" 
            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
          />
        </div>

        {/* Selecció MONEDA */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="block text-xs font-bold text-slate-500 uppercase">Moneda</label>
            {!canChangeCurrency && <span className="text-xs text-rose-500 font-bold flex gap-1"><Lock size={12}/> Bloquejat</span>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CURRENCIES.map(c => (
              <button 
                key={c.code} 
                onClick={() => handleCurrencyChange(c)} 
                disabled={!canChangeCurrency} 
                className={`p-3 rounded-xl border-2 text-sm font-bold flex justify-center gap-2 transition-colors
                  ${tripData.currency.code === c.code ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100'} 
                  ${!canChangeCurrency && tripData.currency.code !== c.code ? 'opacity-40' : ''}`}
              >
                <span>{c.symbol}</span> {c.code}
              </button>
            ))}
          </div>
        </div>

        {/* --- AQUÍ ESTÀ EL BOTÓ DE BACKUP --- */}
        <div>
           <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Còpia de Seguretat</label>
           <button 
             onClick={() => downloadBackup(tripData)}
             className="w-full p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-200"
           >
             <Download size={18} />
             Descarregar JSON
           </button>
        </div>

        <Button onClick={handleSave}>Guardar canvis</Button>
        
        <div className="border-t pt-4">
          <button onClick={onLeaveTrip} className="w-full p-3 flex justify-center gap-2 text-rose-600 bg-rose-50 hover:bg-rose-100 font-bold rounded-xl transition-colors">
            <LogOut size={18}/> Abandonar Grup
          </button>
        </div>
      </div>
    </Modal>
  );
}