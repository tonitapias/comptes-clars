import React, { useState, useEffect } from 'react';
import { Trash2, Calculator, Scale, AlertCircle } from 'lucide-react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore'; 
import Button from '../Button';
import Modal from '../Modal';
import { CATEGORIES } from '../../utils/constants';
import { Expense, CategoryId, Currency, SplitType } from '../../types';
import { db, appId } from '../../config/firebase'; 

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  onDelete?: (id: string | number) => void;
  initialData?: Expense | null;
  users: string[];
  currency: Currency;
}

export default function ExpenseModal({ isOpen, onClose, tripId, onDelete, initialData, users, currency }: ExpenseModalProps) {
  // ESTAT DEL FORMULARI
  const [formData, setFormData] = useState<{
    title: string; amount: string; payer: string; category: CategoryId; involved: string[]; date: string;
    splitType: SplitType; splitDetails: Record<string, number>;
  }>({ 
    title: '', amount: '', payer: '', category: 'food', involved: [], date: '',
    splitType: 'equal', splitDetails: {}
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicialitzar dades
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
             ? Object.fromEntries(Object.entries(initialData.splitDetails || {}).map(([k, v]) => [k, v / 100])) // Convertir cèntims a unitats per visualitzar
             : initialData.splitDetails || {}
        });
      } else {
        // Valors per defecte
        const defaultDetails: Record<string, number> = {};
        users.forEach(u => defaultDetails[u] = 1); // Per defecte 1 part per persona
        
        setFormData({ 
          title: '', amount: '', 
          payer: users.length > 0 ? users[0] : '', 
          category: 'food', involved: [], 
          date: new Date().toISOString().split('T')[0],
          splitType: 'equal',
          splitDetails: defaultDetails
        });
      }
    }
  }, [isOpen, initialData, users]);

  // Validació de l'import "Exacte"
  const currentTotalAmount = parseFloat(formData.amount.replace(',', '.')) || 0;
  
  // Calcular suma actual del repartiment
  const currentSplitSum = formData.splitType === 'exact' 
    ? Object.values(formData.splitDetails).reduce((sum, val) => sum + (Number(val) || 0), 0)
    : 0;

  const exactDiff = currentTotalAmount - currentSplitSum;
  const isExactValid = Math.abs(exactDiff) < 0.02; // Marge petit d'error decimal

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || !formData.payer) return;
    if (formData.splitType === 'exact' && !isExactValid) {
        alert(`Els imports no quadren. Sobren/Falten ${exactDiff.toFixed(2)} ${currency.symbol}`);
        return;
    }
    
    setIsSubmitting(true);

    try {
        const dateObj = formData.date ? new Date(formData.date) : new Date();
        dateObj.setHours(12, 0, 0, 0);

        const safeAmount = formData.amount.replace(',', '.');
        const amountInCents = Math.round(parseFloat(safeAmount) * 100);

        // Preparar splitDetails per guardar (convertir a cèntims si és exacte)
        let finalSplitDetails = { ...formData.splitDetails };
        if (formData.splitType === 'exact') {
            Object.keys(finalSplitDetails).forEach(key => {
                finalSplitDetails[key] = Math.round(finalSplitDetails[key] * 100);
            });
        }
        // Si és equal, no cal guardar detalls (estalvi d'espai)
        if (formData.splitType === 'equal') {
            finalSplitDetails = {};
        } else {
            // Netejar usuaris amb valor 0 per no embrutar
            Object.keys(finalSplitDetails).forEach(k => {
                if (!finalSplitDetails[k]) delete finalSplitDetails[k];
            });
        }

        const expensePayload = {
          title: formData.title,
          amount: amountInCents, 
          payer: formData.payer,
          category: formData.category,
          involved: formData.involved.length > 0 ? formData.involved : users,
          date: dateObj.toISOString(),
          splitType: formData.splitType,
          splitDetails: finalSplitDetails
        };

        const tripDocId = `trip_${tripId}`;
        const collectionPath = initialData 
            ? doc(db, 'artifacts', appId, 'public', 'data', 'trips', tripDocId, 'expenses', String(initialData.id))
            : collection(db, 'artifacts', appId, 'public', 'data', 'trips', tripDocId, 'expenses');

        if (initialData) await updateDoc(collectionPath as any, expensePayload);
        else await addDoc(collectionPath as any, expensePayload);

        onClose();
    } catch (error) {
        console.error("Error:", error);
        alert("Error guardant.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const toggleInvolved = (user: string) => {
    const current = formData.involved.length === 0 ? [...users] : formData.involved;
    const updated = current.includes(user) ? current.filter(u => u !== user) : [...current, user];
    setFormData({ ...formData, involved: updated });
  };

  const updateSplitDetail = (user: string, value: string) => {
      const numVal = parseFloat(value) || 0;
      setFormData(prev => ({
          ...prev,
          splitDetails: { ...prev.splitDetails, [user]: numVal }
      }));
  };

  const isTransfer = formData.category === 'transfer';
  const isAllInvolved = formData.involved.length === 0 || formData.involved.length === users.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Editar Despesa" : "Nova Despesa"}>
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* INPUT IMPORT */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-400 font-light">{currency.symbol}</span>
          <input 
            type="text" inputMode="decimal" placeholder="0.00" autoFocus={!initialData}
            className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl text-4xl font-bold text-slate-800 text-center outline-none transition-all" 
            value={formData.amount} 
            onChange={(e) => setFormData({...formData, amount: e.target.value})} 
          />
        </div>

        {/* INFO BASICA */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Concepte</label>
            <input type="text" required placeholder="Sopar..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Categoria</label>
            <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value as CategoryId})}>
              {CATEGORIES.filter(c => c.id !== 'all').map(c => (<option key={c.id} value={c.id}>{c.label}</option>))}
            </select>
          </div>
        </div>

        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Data</label>
            <input type="date" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
        </div>

        {/* PAGADOR */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{isTransfer ? 'Qui paga (Origen)?' : 'Pagador'}</label>
          <div className="flex flex-wrap gap-2">
            {users.map(u => (
              <button type="button" key={u} onClick={() => setFormData({...formData, payer: u})} 
                className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${formData.payer === u ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* SECCIÓ REPARTIMENT */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <label className="block text-xs font-bold text-slate-500 uppercase">{isTransfer ? 'Receptor' : 'Repartiment'}</label>
            
            {/* Tabs Selector de Mode */}
            {!isTransfer && (
                <div className="flex bg-slate-200 p-1 rounded-lg">
                    <button type="button" onClick={() => setFormData({...formData, splitType: 'equal'})} className={`px-2 py-1 rounded text-xs font-bold transition-all ${formData.splitType === 'equal' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Igual</button>
                    <button type="button" onClick={() => setFormData({...formData, splitType: 'exact'})} className={`px-2 py-1 rounded text-xs font-bold transition-all ${formData.splitType === 'exact' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Exacte</button>
                    <button type="button" onClick={() => setFormData({...formData, splitType: 'shares'})} className={`px-2 py-1 rounded text-xs font-bold transition-all ${formData.splitType === 'shares' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Parts</button>
                </div>
            )}
            
            {formData.splitType === 'equal' && !isTransfer && (
                <button type="button" onClick={() => setFormData({...formData, involved: isAllInvolved ? [] : users})} className="text-xs font-bold text-indigo-600">
                {isAllInvolved ? 'Desmarcar' : 'Tothom'}
                </button>
            )}
          </div>

          {/* Contingut Dinàmic segons Mode */}
          <div className="space-y-2">
            
            {/* MODE IGUAL */}
            {formData.splitType === 'equal' && (
                <div className="grid grid-cols-2 gap-2">
                    {users.map(u => {
                    const isSelected = formData.involved.length === 0 || formData.involved.includes(u);
                    const isSelf = isTransfer && u === formData.payer;
                    return (
                        <button type="button" key={u} disabled={isSelf} onClick={() => !isSelf && toggleInvolved(u)} 
                        className={`flex items-center gap-2 p-2 rounded-lg text-sm font-medium transition-all ${isSelf ? 'opacity-30 cursor-not-allowed' : ''} ${isSelected && !isSelf ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200' : 'text-slate-400 opacity-50'}`}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected && !isSelf ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                            {isSelected && !isSelf && <div className="w-1.5 h-1.5 bg-white rounded-full"/>}
                        </div> 
                        {u}
                        </button>
                    )
                    })}
                </div>
            )}

            {/* MODE EXACTE i PARTS */}
            {(formData.splitType === 'exact' || formData.splitType === 'shares') && !isTransfer && (
                <div className="space-y-2">
                    {users.map(u => (
                        <div key={u} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                             <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{u.charAt(0)}</div>
                             <span className="flex-1 text-sm font-medium text-slate-700 truncate">{u}</span>
                             <div className="flex items-center gap-2">
                                {formData.splitType === 'shares' && <span className="text-xs text-slate-400 font-bold uppercase">Parts</span>}
                                <input 
                                    type="number" 
                                    step={formData.splitType === 'exact' ? "0.01" : "1"}
                                    min="0"
                                    placeholder="0"
                                    className={`w-20 p-1 text-right font-bold text-slate-800 bg-slate-50 rounded border focus:border-indigo-500 outline-none ${formData.splitType === 'exact' ? 'pr-6' : ''}`}
                                    value={formData.splitDetails[u] || ''}
                                    onChange={(e) => updateSplitDetail(u, e.target.value)}
                                />
                                {formData.splitType === 'exact' && <span className="text-xs font-bold text-slate-400 absolute right-6">{currency.symbol}</span>}
                             </div>
                        </div>
                    ))}
                    
                    {/* Validació Visual */}
                    {formData.splitType === 'exact' && (
                        <div className={`mt-3 text-xs font-bold flex items-center justify-between px-2 ${isExactValid ? 'text-emerald-600' : 'text-rose-500'}`}>
                            <span>{isExactValid ? 'Tot quadrat' : `Falten/Sobren: ${exactDiff.toFixed(2)} ${currency.symbol}`}</span>
                            <span>Total: {currentSplitSum.toFixed(2)} / {currentTotalAmount.toFixed(2)}</span>
                        </div>
                    )}
                </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {initialData && onDelete && <Button variant="danger" className="w-14" icon={Trash2} onClick={(e) => { e.preventDefault(); onDelete(initialData.id); }}></Button>}
          <Button className="flex-1 text-lg py-4" type="submit" disabled={!formData.amount || !formData.title || !formData.payer || isSubmitting}>
            {isSubmitting ? 'Guardant...' : (initialData ? "Guardar Canvis" : "Afegir Despesa")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}