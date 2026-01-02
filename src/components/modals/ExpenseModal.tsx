import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import Button from '../Button';
import Modal from '../Modal';
import { CATEGORIES } from '../../utils/constants';
import { Expense, CategoryId, Currency } from '../../types';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (expense: Expense) => Promise<void>;
  onDelete?: (id: string | number) => void;
  initialData?: Expense | null;
  users: string[];
  currency: Currency;
}

export default function ExpenseModal({ isOpen, onClose, onSubmit, onDelete, initialData, users, currency }: ExpenseModalProps) {
  const [formData, setFormData] = useState<{
    title: string; amount: string; payer: string; category: CategoryId; involved: string[]; date: string
  }>({ title: '', amount: '', payer: '', category: 'food', involved: [], date: '' });

  // Reiniciar o carregar dades quan s'obre el modal
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          title: initialData.title,
          amount: initialData.amount.toString(),
          payer: initialData.payer,
          category: initialData.category,
          involved: initialData.involved,
          date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : ''
        });
      } else {
        // Valors per defecte
        setFormData({ 
          title: '', amount: '', payer: users[0] || '', category: 'food', involved: [], 
          date: new Date().toISOString().split('T')[0] 
        });
      }
    }
  }, [isOpen, initialData, users]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;
    
    let finalDate = formData.date ? new Date(formData.date) : new Date();
    finalDate.setHours(12, 0, 0, 0);

    const expense: Expense = {
      id: initialData?.id || Date.now(),
      title: formData.title,
      amount: parseFloat(formData.amount),
      payer: formData.payer,
      category: formData.category,
      involved: formData.involved.length > 0 ? formData.involved : users, // Si està buit, implica tothom
      date: finalDate.toISOString()
    };

    await onSubmit(expense);
    onClose();
  };

  const toggleInvolved = (user: string) => {
    const current = formData.involved.length === 0 ? [...users] : formData.involved;
    const updated = current.includes(user) ? current.filter(u => u !== user) : [...current, user];
    setFormData({ ...formData, involved: updated });
  };

  const isAllInvolved = formData.involved.length === 0 || formData.involved.length === users.length;
  const isTransfer = formData.category === 'transfer';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Editar Despesa" : "Nova Despesa"}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Import */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-400 font-light">{currency.symbol}</span>
          <input 
            type="number" step="0.01" placeholder="0.00" autoFocus={!initialData}
            className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl text-4xl font-bold text-slate-800 text-center outline-none" 
            value={formData.amount} 
            onChange={(e) => setFormData({...formData, amount: e.target.value})} 
          />
        </div>

        {/* Detalls */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Concepte</label>
            <input type="text" placeholder="Sopar..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
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
            <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
        </div>

        {/* Pagador */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
             {isTransfer ? 'Qui paga (Origen)?' : 'Pagador'}
          </label>
          <div className="flex flex-wrap gap-2">
            {users.map(u => (
              <button type="button" key={u} onClick={() => setFormData({...formData, payer: u})} 
                className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${formData.payer === u ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200'}`}>
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Involucrats / Receptors (Ara sempre visible!) */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="flex justify-between mb-2">
            <label className="block text-xs font-bold text-slate-500 uppercase">
                {isTransfer ? 'Receptors (Qui rep els diners?)' : 'Participants'}
            </label>
            
            {/* Si és transferència, potser no vols un botó de "Tothom" tan destacat, però el deixem per flexibilitat */}
            <button type="button" onClick={() => setFormData({...formData, involved: isAllInvolved ? [] : users})} className="text-xs font-bold text-indigo-600">
              {isAllInvolved ? 'Desmarcar' : 'Tothom'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {users.map(u => {
              const isSelected = formData.involved.length === 0 || formData.involved.includes(u);
              // Evitem que el pagador es pugui seleccionar a si mateix com a receptor en una transferència
              const isSelf = isTransfer && u === formData.payer;
              
              return (
                <button 
                  type="button" 
                  key={u} 
                  disabled={isSelf}
                  onClick={() => !isSelf && toggleInvolved(u)} 
                  className={`flex items-center gap-2 p-2 rounded-lg text-sm font-medium transition-all 
                    ${isSelf ? 'opacity-30 cursor-not-allowed' : ''}
                    ${isSelected && !isSelf ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200' : 'text-slate-400 opacity-50'}
                  `}>
                  <div className={`w-4 h-4 rounded border ${isSelected && !isSelf ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}></div> {u}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex gap-2">
          {initialData && onDelete && (
            <Button variant="danger" className="w-16" icon={Trash2} onClick={(e) => { e.preventDefault(); onDelete(initialData.id); }}></Button>
          )}
          <Button className="flex-1 text-lg py-4" type="submit" disabled={!formData.amount || !formData.title}>
            {initialData ? "Guardar" : "Afegir"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}