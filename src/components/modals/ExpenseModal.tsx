import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, AlertCircle } from 'lucide-react';
import Button from '../Button';
import Modal from '../Modal';
import { CATEGORIES } from '../../utils/constants';
import { Expense, CategoryId, Currency, SplitType, TripUser } from '../../types';
import { TripService } from '../../services/tripService';
import { ToastType } from '../Toast';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  onDelete?: (id: string | number) => void;
  initialData?: Expense | null;
  users: TripUser[]; 
  currency: Currency;
  showToast: (msg: string, type?: ToastType) => void;
}

export default function ExpenseModal({ isOpen, onClose, tripId, onDelete, initialData, users, currency, showToast }: ExpenseModalProps) {
  
  const visibleUsers = useMemo(() => {
    return users.filter(u => 
      !u.isDeleted || 
      (initialData && (u.id === initialData.payer || initialData.involved.includes(u.id)))
    );
  }, [users, initialData]);

  const defaultPayerId = visibleUsers.length > 0 ? visibleUsers[0].id : '';

  const [formData, setFormData] = useState<{
    title: string; amount: string; payer: string; category: CategoryId; involved: string[]; date: string;
    splitType: SplitType; splitDetails: Record<string, number>;
  }>({ 
    title: '', amount: '', payer: '', category: 'food', involved: [], date: '',
    splitType: 'equal', splitDetails: {}
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          title: initialData.title,
          amount: (initialData.amount / 100).toFixed(2), 
          payer: initialData.payer,
          category: initialData.category,
          involved: initialData.involved,
          date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : '',
          splitType: initialData.splitType || 'equal',
          splitDetails: initialData.splitType === 'exact' 
             ? Object.fromEntries(Object.entries(initialData.splitDetails || {}).map(([k, v]) => [k, v / 100]))
             : initialData.splitDetails || {}
        });
      } else {
        const defaultDetails: Record<string, number> = {};
        setFormData({ 
          title: '', amount: '', payer: defaultPayerId, category: 'food', involved: [], 
          date: new Date().toISOString().split('T')[0], splitType: 'equal', splitDetails: defaultDetails
        });
      }
    }
  }, [isOpen, initialData, users, defaultPayerId]);

  const safeParseFloat = (str: string) => { const val = parseFloat(str.replace(',', '.')); return isNaN(val) ? 0 : val; };
  const currentTotalCents = Math.round(safeParseFloat(formData.amount) * 100);
  const currentSplitSumCents = formData.splitType === 'exact' ? Object.values(formData.splitDetails).reduce((sum, val) => sum + Math.round((Number(val) || 0) * 100), 0) : 0;
  
  const diffCents = currentTotalCents - currentSplitSumCents;
  const isExactValid = Math.abs(diffCents) < 2; 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentTotalCents === 0) return showToast("Introdueix un import vàlid.", 'error');
    if (!formData.title.trim()) return showToast("Falta el concepte.", 'error');
    if (!formData.payer) return showToast("Selecciona qui paga.", 'error');
    
    setIsSubmitting(true);

    try {
        const dateObj = formData.date ? new Date(`${formData.date}T12:00:00`) : new Date();
        let finalSplitDetails = { ...formData.splitDetails };
        if (formData.splitType === 'exact') Object.keys(finalSplitDetails).forEach(k => finalSplitDetails[k] = Math.round((finalSplitDetails[k] || 0) * 100));
        
        const finalInvolved = formData.involved.length > 0 ? formData.involved : visibleUsers.map(u => u.id);

        const expensePayload = {
          title: formData.title.trim(), amount: currentTotalCents, payer: formData.payer, category: formData.category,
          involved: finalInvolved,
          date: dateObj.toISOString(), splitType: formData.splitType, splitDetails: finalSplitDetails
        };

        if (initialData) await TripService.updateExpense(tripId, String(initialData.id), expensePayload);
        else await TripService.addExpense(tripId, expensePayload);

        onClose();
        showToast(initialData ? "Despesa actualitzada" : "Despesa creada", 'success');
    } catch (error) {
        showToast("Error guardant la despesa", 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const toggleInvolved = (userId: string) => {
    const allIds = visibleUsers.map(u => u.id);
    const current = formData.involved.length === 0 ? [...allIds] : formData.involved;
    const updated = current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId];
    setFormData({ ...formData, involved: updated });
  };

  const updateSplitDetail = (userId: string, value: string) => {
      const numVal = value === '' ? 0 : parseFloat(value.replace(',', '.'));
      const safeVal = isNaN(numVal) ? 0 : numVal;
      
      setFormData(prev => {
          const newDetails = { ...prev.splitDetails, [userId]: safeVal };
          if (prev.splitType === 'exact') {
              const totalSum = Object.values(newDetails).reduce((acc, curr) => acc + (curr || 0), 0);
              let newAmount = prev.amount;
              newAmount = totalSum === 0 ? '' : totalSum.toFixed(2);
              return { ...prev, splitDetails: newDetails, amount: newAmount };
          }
          return { ...prev, splitDetails: newDetails };
      });
  };

  const isTransfer = formData.category === 'transfer';
  const isAllInvolved = formData.involved.length === 0 || visibleUsers.every(u => formData.involved.includes(u.id));
  const isExactMode = formData.splitType === 'exact';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Editar Despesa" : "Nova Despesa"}>
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* INPUT IMPORT GRAN */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-400 font-light">{currency.symbol}</span>
          <input 
            type="text" 
            inputMode="decimal" 
            placeholder="0.00" 
            autoFocus={!initialData && !isExactMode} 
            readOnly={isExactMode}
            // AFEGIT: dark:bg-slate-950 dark:border-slate-800 dark:text-white dark:focus:border-indigo-500
            className={`w-full pl-10 pr-4 py-4 border-2 rounded-2xl text-4xl font-bold text-center outline-none transition-all ${
                isExactMode 
                ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500' 
                : 'bg-slate-50 border-transparent text-slate-800 focus:bg-white focus:border-indigo-500 dark:bg-slate-950 dark:border-slate-800 dark:text-white dark:focus:bg-black dark:focus:border-indigo-500'
            }`} 
            value={formData.amount} 
            onChange={(e) => { if (/^[\d.,]*$/.test(e.target.value)) setFormData({...formData, amount: e.target.value}); }} 
          />
          {isExactMode && <p className="text-center text-xs text-slate-400 mt-1 font-medium">Suma automàtica (edita a sota)</p>}
        </div>

        {/* INPUTS DE CONCEPTE I CATEGORIA */}
        <div className="flex gap-3">
          <div className="flex-1">
             <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Concepte</label>
             {/* AFEGIT: dark:bg-slate-950 dark:border-slate-800 dark:text-white */}
             <input type="text" placeholder="Sopar..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-950 dark:border-slate-800 dark:text-white dark:placeholder-slate-600" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
          </div>
          <div>
             <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Categoria</label>
             {/* AFEGIT: dark:bg-slate-950 dark:border-slate-800 dark:text-white */}
             <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none dark:bg-slate-950 dark:border-slate-800 dark:text-white" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value as CategoryId})}>
                 {CATEGORIES.filter(c => c.id !== 'all').map(c => (<option key={c.id} value={c.id}>{c.label}</option>))}
             </select>
          </div>
        </div>

        <div>
             <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Data</label>
             {/* AFEGIT: dark:bg-slate-950 dark:border-slate-800 dark:text-white */}
             <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none dark:bg-slate-950 dark:border-slate-800 dark:text-white" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
        </div>

        {/* SELECCIÓ DE PAGADOR */}
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{isTransfer ? 'Qui paga (Origen)?' : 'Pagador'}</label>
          <div className="flex flex-wrap gap-2">
            {visibleUsers.map(u => (
              <button 
                type="button" key={u.id} onClick={() => setFormData({...formData, payer: u.id})} 
                // AFEGIT: dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 (estat inactiu)
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all relative 
                ${formData.payer === u.id 
                    ? 'bg-indigo-600 border-indigo-600 text-white dark:bg-indigo-600 dark:border-indigo-600' 
                    : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600'}`}
              >
                {u.isDeleted && <span className="absolute -top-1 -right-1 flex h-3 w-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>}
                <div className="w-5 h-5 rounded-full overflow-hidden bg-black/10 dark:bg-white/10 flex items-center justify-center text-[8px]">{u.photoUrl ? <img src={u.photoUrl} className="w-full h-full object-cover" /> : u.name.charAt(0)}</div>
                {u.name}
              </button>
            ))}
          </div>
        </div>

        {/* SECCIÓ DE REPARTIMENT (CAIXA GRISA) */}
        {/* AFEGIT: dark:bg-slate-800 dark:border-slate-700 */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 dark:bg-slate-800 dark:border-slate-700 transition-colors">
          <div className="flex justify-between items-center mb-4">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{isTransfer ? 'Receptor' : 'Repartiment'}</label>
            {!isTransfer && (
                // AFEGIT: dark:bg-slate-900 (contenidor botons petits)
                <div className="flex bg-slate-200 p-1 rounded-lg dark:bg-slate-900">
                    {['equal', 'exact', 'shares'].map(t => (
                        <button type="button" key={t} onClick={() => setFormData({...formData, splitType: t as SplitType})} 
                        // AFEGIT: dark:bg-slate-700 dark:text-white (actiu) vs dark:text-slate-500 (inactiu)
                        className={`px-2 py-1 rounded text-xs font-bold transition-all ${formData.splitType === t ? 'bg-white shadow text-indigo-600 dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                            {t === 'equal' ? 'Igual' : t === 'exact' ? 'Exacte' : 'Parts'}
                        </button>
                    ))}
                </div>
            )}
            {formData.splitType === 'equal' && !isTransfer && (<button type="button" onClick={() => setFormData({...formData, involved: isAllInvolved ? [] : visibleUsers.map(u => u.id)})} className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{isAllInvolved ? 'Desmarcar' : 'Tothom'}</button>)}
          </div>

          <div className="space-y-2">
            {formData.splitType === 'equal' && (
                <div className="grid grid-cols-2 gap-2">
                    {visibleUsers.map(u => {
                    const isSelected = formData.involved.length === 0 || formData.involved.includes(u.id);
                    const isSelf = isTransfer && u.id === formData.payer;
                    return (
                        <button type="button" key={u.id} disabled={isSelf} onClick={() => !isSelf && toggleInvolved(u.id)} 
                        // AFEGIT: dark:bg-slate-700 (seleccionat)
                        className={`flex items-center gap-2 p-2 rounded-lg text-sm font-medium transition-all ${isSelf ? 'opacity-30 cursor-not-allowed' : ''} 
                        ${isSelected && !isSelf 
                            ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200 dark:bg-slate-900 dark:border-indigo-900 dark:text-indigo-300' 
                            : 'text-slate-400 opacity-50 dark:text-slate-500'}`}>
                        
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected && !isSelf ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}>{isSelected && !isSelf && <div className="w-1.5 h-1.5 bg-white rounded-full"/>}</div> 
                        <span className="truncate flex items-center gap-1">
                            {u.name} {u.isDeleted && <AlertCircle size={10} className="text-red-400"/>}
                        </span>
                        </button>
                    )})}
                </div>
            )}
            {(formData.splitType === 'exact' || formData.splitType === 'shares') && !isTransfer && (
                <div className="space-y-2">
                    {visibleUsers.map(u => (
                        // AFEGIT: dark:bg-slate-900 dark:border-slate-700
                        <div key={u.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 dark:bg-slate-900 dark:border-slate-700 transition-colors">
                             <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 overflow-hidden shrink-0">{u.photoUrl ? <img src={u.photoUrl} className="w-full h-full object-cover"/> : u.name.charAt(0)}</div>
                             <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{u.name} {u.isDeleted && '(Ex)'}</span>
                             <div className="flex items-center gap-2 relative">
                                {/* AFEGIT: dark:bg-slate-800 dark:text-white dark:border-slate-700 */}
                                <input type="number" step={formData.splitType === 'exact' ? "0.01" : "1"} min="0" placeholder="0" 
                                className={`w-20 p-1 text-right font-bold text-slate-800 bg-slate-50 rounded border outline-none 
                                dark:bg-slate-800 dark:border-slate-600 dark:text-white
                                ${formData.splitType === 'exact' ? 'pr-6' : ''} 
                                ${isExactMode ? 'focus:border-indigo-500' : (formData.splitType === 'exact' && !isExactValid ? 'focus:border-rose-500 border-rose-200' : 'focus:border-indigo-500')}`} 
                                value={formData.splitDetails[u.id] ?? ''} onChange={(e) => updateSplitDetail(u.id, e.target.value)} />
                                {formData.splitType === 'exact' && <span className="text-xs font-bold text-slate-400 absolute right-6 pointer-events-none">{currency.symbol}</span>}
                             </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          {initialData && onDelete && <Button variant="danger" className="w-14" icon={Trash2} onClick={(e) => { e.preventDefault(); onDelete(initialData.id); }}></Button>}
          <Button className="flex-1 text-lg py-4" type="submit" disabled={isSubmitting || (formData.splitType === 'exact' && !isExactValid)}>{isSubmitting ? 'Guardant...' : (initialData ? "Guardar Canvis" : "Afegir Despesa")}</Button>
        </div>
      </form>
    </Modal>
  );
}