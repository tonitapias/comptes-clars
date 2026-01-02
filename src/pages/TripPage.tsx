import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Plus, Users, Receipt, ArrowRightLeft, Trash2, CheckCircle2, 
  ChevronRight, Search, Edit2, Info, Settings, Share2, LogOut, 
  Loader2, Check, Calendar, AlertTriangle 
} from 'lucide-react';
// --- CORRECCIÓ: Afegit arrayUnion als imports ---
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { User } from 'firebase/auth';

import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import DonutChart from '../components/DonutChart';
import ExpenseModal from '../components/modals/ExpenseModal';
import GroupModal from '../components/modals/GroupModal';
import { db, appId } from '../config/firebase';
import { CURRENCIES, CATEGORIES } from '../utils/constants';
import { useTripCalculations } from '../hooks/useTripCalculations';
import { TripData, Expense, CategoryId, Settlement } from '../types';

interface TripPageProps {
  user: User | null;
}

export default function TripPage({ user }: TripPageProps) {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- ESTATS DE UI ---
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'settle'>('expenses');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<CategoryId | 'all'>('all');
  const [copied, setCopied] = useState(false);

  // --- ESTATS DE MODALS ---
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settleModalOpen, setSettleModalOpen] = useState<Settlement | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; id?: string | number; title: string; message: string } | null>(null);
  
  // --- ESTATS DE SETTINGS ---
  const [editTripName, setEditTripName] = useState('');
  const [editTripDate, setEditTripDate] = useState('');

  // 1. Càrrega de dades
  useEffect(() => {
    if (tripId) localStorage.setItem('cc-last-trip-id', tripId);
  }, [tripId]);

  useEffect(() => {
    if (!tripId) return;
    setLoading(true);
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as TripData;
        setTripData(data);
        setEditTripName(data.name);
        setEditTripDate(data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : '');
        setLoading(false);
      } else {
        setError("Viatge no trobat");
        setLoading(false);
      }
    }, (err) => { console.error(err); setError(err.message); setLoading(false); });
    return () => unsubscribe();
  }, [tripId]);

  // 2. Helpers i Hooks
  const { users, expenses, currency = CURRENCIES[0], name, createdAt } = tripData || { users: [], expenses: [] };
  const { filteredExpenses, balances, categoryStats, settlements, totalGroupSpending } = useTripCalculations(expenses || [], users || [], searchQuery, filterCategory);

  const formatCurrency = (amount: number) => new Intl.NumberFormat(currency?.locale || 'ca-ES', { style: 'currency', currency: currency?.code || 'EUR' }).format(amount);
  const getCategory = (id: string) => CATEGORIES.find(c => c.id === id) || CATEGORIES[10];
  const formatDateDisplay = (d: string) => d ? new Date(d).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' }) : '';
  
  const copyCode = () => {
    navigator.clipboard.writeText(tripId || '').then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  // 3. Accions de Base de Dades
  const updateTrip = async (newData: Partial<TripData>) => {
    if (!tripId) return;
    try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`), newData); }
    catch (e: any) { alert("Error guardant: " + e.message); }
  };

  // --- CORRECCIÓ APLICADA: Gestió segura de despeses ---
  const handleSaveExpense = async (expense: Expense) => {
    if (!tripId) return;
    
    // Comprovem si estem editant una despesa existent
    const isEdit = expenses.some(e => e.id === expense.id);

    if (isEdit) {
      // EDICIÓ: Substituïm la despesa a l'array local i enviem tot l'array.
      // (Per a edicions és més complex usar arrayUnion/Remove, així que mantenim aquest mètode)
      const newExpensesList = expenses.map(e => e.id === expense.id ? expense : e);
      await updateTrip({ expenses: newExpensesList });
    } else {
      // NOVA DESPESA: Utilitzem arrayUnion per afegir-la a la cua de forma segura (Atomic Operation).
      // Això evita que si dos usuaris guarden a la vegada, un sobreescrigui a l'altre.
      try {
        const tripRef = doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`);
        await updateDoc(tripRef, {
            expenses: arrayUnion(expense)
        });
      } catch (e: any) {
        alert("Error guardant: " + e.message);
      }
    }
  };

  const handleDeleteExpense = (id: string | number) => {
    setConfirmAction({ type: 'delete_expense', id, title: 'Eliminar Despesa', message: 'Estàs segur?' });
  };

  const handleSettleDebt = async () => {
    if (!settleModalOpen || !tripId) return;
    
    const repayment: Expense = { 
      id: Date.now(), 
      title: `Pagament deute`, 
      amount: settleModalOpen.amount, 
      payer: settleModalOpen.from, 
      category: 'transfer', 
      involved: [settleModalOpen.to], 
      date: new Date().toISOString() 
    };

    // També fem servir arrayUnion per als pagaments de deutes
    try {
        const tripRef = doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`);
        await updateDoc(tripRef, { expenses: arrayUnion(repayment) });
        setSettleModalOpen(null);
    } catch (e: any) {
        alert("Error liquidant: " + e.message);
    }
  };

  // Gestió d'Usuaris
  const handleAddUser = async (name: string) => await updateTrip({ users: [...users, name] });
  const handleRenameUser = async (oldName: string, newName: string) => {
    const newUsers = users.map(u => u === oldName ? newName : u);
    const newExpenses = expenses.map(exp => ({ ...exp, payer: exp.payer === oldName ? newName : exp.payer, involved: exp.involved.map(inv => inv === oldName ? newName : inv) }));
    await updateTrip({ users: newUsers, expenses: newExpenses });
  };
  const requestDeleteUser = (userName: string) => {
    if (expenses.some(e => e.payer === userName || e.involved.includes(userName))) setConfirmAction({ type: 'info', title: 'Acció no permesa', message: "Aquest usuari té despeses assignades." });
    else setConfirmAction({ type: 'delete_user', id: userName, title: 'Eliminar Participant', message: `Segur que vols eliminar a ${userName}?` });
  };

  const executeConfirmation = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'delete_expense') await updateTrip({ expenses: expenses.filter(exp => exp.id !== confirmAction.id) });
    else if (confirmAction.type === 'delete_user') await updateTrip({ users: users.filter(u => u !== confirmAction.id) });
    setConfirmAction(null); 
    setIsExpenseModalOpen(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600"/></div>;
  if (error) return <div className="min-h-screen flex flex-col items-center justify-center gap-4"><AlertTriangle className="text-red-500" size={40}/><p className="text-slate-600 font-bold">{error}</p><Button variant="secondary" onClick={() => { localStorage.removeItem('cc-last-trip-id'); navigate('/'); }}>Tornar a l'inici</Button></div>;
  if (!tripData) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 md:pb-10">
      {copied && <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg z-[60] flex items-center gap-2 animate-fade-in font-bold"><CheckCircle2 size={18} /> Codi copiat!</div>}
      
      {/* HEADER */}
      <header className="bg-gradient-to-br from-indigo-800 to-indigo-600 text-white pt-8 pb-20 px-6 shadow-xl relative overflow-hidden">
        <div className="max-w-3xl mx-auto flex justify-between items-start relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2"><button className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors" onClick={() => { localStorage.removeItem('cc-last-trip-id'); navigate('/'); }}><LogOut className="text-indigo-100" size={16} /></button><span className="text-indigo-200 text-xs font-bold tracking-wider uppercase">En línia • {tripId}</span></div>
            <h1 className="text-2xl font-bold tracking-tight cursor-pointer hover:opacity-90" onClick={() => setSettingsModalOpen(true)}>{name} <Edit2 size={16} className="inline opacity-50"/></h1>
            {createdAt && <p className="text-indigo-200 text-xs mt-1 flex items-center gap-1 opacity-80"><Calendar size={12} /> {new Date(createdAt).toLocaleDateString('ca-ES', { dateStyle: 'long' })}</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSettingsModalOpen(true)} className="bg-white/20 hover:bg-white/30 p-2.5 rounded-xl transition-colors backdrop-blur-md text-indigo-100"><Settings size={20} /></button>
            <button onClick={copyCode} className={`p-2.5 rounded-xl transition-all backdrop-blur-md text-indigo-100 ${copied ? 'bg-emerald-500' : 'bg-white/20 hover:bg-white/30'}`}>{copied ? <Check size={20} /> : <Share2 size={20} />}</button>
            <button onClick={() => setGroupModalOpen(true)} className="bg-white text-indigo-600 hover:bg-indigo-50 py-2 px-3 rounded-xl transition-colors shadow-lg font-bold text-sm flex items-center gap-2"><Users size={16} /> {users.length}</button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-3xl mx-auto px-4 -mt-14 relative z-20">
        <Card className="mb-6 bg-white shadow-xl shadow-indigo-100/50 border-0">
          <div className="p-6 flex justify-between items-center">
            <div><p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Total</p><h2 className="text-3xl font-extrabold text-slate-800">{formatCurrency(totalGroupSpending)}</h2></div>
            <div className="text-right pl-4 border-l border-slate-100"><p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Per persona</p><p className="text-xl font-bold text-indigo-600">{users.length > 0 ? formatCurrency(totalGroupSpending / users.length) : formatCurrency(0)}</p></div>
          </div>
        </Card>
        
        {/* TABS */}
        <div className="flex p-1.5 bg-white rounded-2xl mb-6 shadow-sm border border-slate-200">
          {(['expenses', 'balances', 'settle'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === tab ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>{tab === 'expenses' ? 'Despeses' : tab === 'balances' ? 'Balanç' : 'Liquidar'}</button>
          ))}
        </div>

        {/* VIEW: EXPENSES */}
        {activeTab === 'expenses' && (
          <div className="space-y-4 animate-fade-in">
             <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center gap-2 flex-1 min-w-[150px] shadow-sm"><Search size={16} className="text-slate-400 ml-1" /><input type="text" placeholder="Buscar..." className="w-full bg-transparent outline-none text-sm font-medium text-slate-700" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
              <select className="bg-white px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 outline-none shadow-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as CategoryId)}>{CATEGORIES.map(c => (<option key={c.id} value={c.id}>{c.label}</option>))}</select>
            </div>
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200"><Receipt size={32} className="text-indigo-300 mx-auto mb-4" /><p className="text-slate-400 text-sm">No hi ha despeses.</p>{!searchQuery && filterCategory === 'all' && <Button onClick={() => { setEditingExpense(null); setIsExpenseModalOpen(true); }} className="mx-auto mt-4" icon={Plus}>Afegir Despesa</Button>}</div>
            ) : (
              <div className="space-y-3">{filteredExpenses.map((expense) => { const category = getCategory(expense.category); const isTransfer = expense.category === 'transfer'; return (
                    <Card key={expense.id} className={`hover:shadow-md transition-all group ${isTransfer ? 'bg-slate-50' : 'bg-white'}`} onClick={() => { setEditingExpense(expense); setIsExpenseModalOpen(true); }}>
                      <div className="flex items-center p-4 cursor-pointer">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-4 shadow-sm ${category.color}`}>{isTransfer ? <ArrowRightLeft size={20}/> : <category.icon size={22} />}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start"><h4 className={`font-bold truncate ${isTransfer ? 'text-slate-600 italic' : 'text-slate-800'}`}>{expense.title}</h4><span className="text-xs text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 ml-2 whitespace-nowrap">{formatDateDisplay(expense.date)}</span></div>
                          <div className="flex items-center gap-2 mt-0.5"><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{expense.payer}</span><span className="text-xs text-slate-500">{isTransfer ? '→' : '•'} {isTransfer ? expense.involved[0] : `${expense.involved.length} pers.`}</span></div>
                        </div>
                        <div className="flex flex-col items-end pl-2">
                          <span className={`font-bold text-lg ${isTransfer ? 'text-slate-500' : 'text-slate-800'}`}>{formatCurrency(expense.amount)}</span>
                        </div>
                      </div>
                    </Card>
                  );})}</div>
            )}
          </div>
        )}

        {/* VIEW: BALANCES */}
        {activeTab === 'balances' && (
           <div className="space-y-6 animate-fade-in">
             {categoryStats.length > 0 && <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-6"><DonutChart data={categoryStats} /><div className="flex-1 space-y-2">{categoryStats.slice(0, 3).map(stat => (<div key={stat.id} className="flex justify-between items-center text-sm"><span className="flex items-center gap-2 font-medium text-slate-600"><div className={`w-3 h-3 rounded-full ${stat.barColor}`}></div>{stat.label}</span><span className="font-bold text-slate-800">{Math.round(stat.percentage)}%</span></div>))}</div></div>}
             <div className="grid gap-3">{balances.map((b) => <Card key={b.user} className="p-0 overflow-hidden"><div className="p-5 relative z-10"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${b.balance >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}>{(b.user || '?').charAt(0)}</div><div><p className="font-bold text-slate-800">{b.user}</p><p className={`text-xs font-bold uppercase ${b.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{b.balance >= 0 ? 'Recupera' : 'Ha de pagar'}</p></div></div><span className={`text-xl font-black ${b.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{b.balance >= 0 ? '+' : ''}{formatCurrency(b.balance)}</span></div></div></Card>)}</div>
           </div>
        )}

        {/* VIEW: SETTLE */}
        {activeTab === 'settle' && (
          <div className="space-y-4 animate-fade-in">
             <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-4 text-sm text-indigo-800 flex gap-2"><Info size={20} className="shrink-0"/> Fes clic en un deute per marcar-lo com a pagat.</div>
             {settlements.length === 0 ? <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 shadow-sm"><CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={32}/><p>Tot quadrat!</p></div> : settlements.map((s, idx) => (<div key={idx} onClick={() => setSettleModalOpen(s)} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98]"><div className="flex flex-col items-center w-20"><span className="font-bold text-rose-600">{s.from}</span></div><div className="flex-1 px-2 flex flex-col items-center"><span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Paga a</span><ChevronRight size={14} className="text-slate-300 my-1"/><div className="bg-indigo-600 text-white px-3 py-1 rounded-full font-bold text-sm shadow-md">{formatCurrency(s.amount)}</div></div><div className="flex flex-col items-center w-20"><span className="font-bold text-emerald-600">{s.to}</span></div></div>))}
          </div>
        )}
      </main>
      
      {/* FLOATING ACTION BUTTON */}
      <button onClick={() => { setEditingExpense(null); setIsExpenseModalOpen(true); }} className="fixed bottom-6 right-6 md:right-[calc(50%-350px)] bg-indigo-600 text-white p-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all z-40 shadow-indigo-200"><Plus size={28} /></button>
      
      {/* --- MODALS --- */}
      
      <ExpenseModal 
        isOpen={isExpenseModalOpen} 
        onClose={() => setIsExpenseModalOpen(false)} 
        initialData={editingExpense} 
        users={users} 
        currency={currency}
        onSubmit={handleSaveExpense}
        onDelete={handleDeleteExpense}
      />

      <GroupModal 
        isOpen={groupModalOpen} 
        onClose={() => setGroupModalOpen(false)} 
        tripId={tripId!} 
        users={users} 
        onAddUser={handleAddUser}
        onRemoveUser={requestDeleteUser}
        onRenameUser={handleRenameUser}
      />

      <Modal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} title="Configuració Viatge"><div className="space-y-6"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nom</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={editTripName} onChange={e => setEditTripName(e.target.value)} /></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Data</label><input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={editTripDate} onChange={e => setEditTripDate(e.target.value)} /></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Moneda</label><div className="grid grid-cols-2 gap-2">{CURRENCIES.map(c => (<button key={c.code} onClick={() => updateTrip({ currency: c })} className={`p-3 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-2 ${currency?.code === c.code ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-slate-300'}`}><span>{c.symbol}</span> {c.code}</button>))}</div></div><Button onClick={async () => { let d = createdAt ? new Date(createdAt) : new Date(); if (editTripDate) d = new Date(editTripDate); d.setHours(12, 0, 0, 0); await updateTrip({ name: editTripName, createdAt: d.toISOString() }); setSettingsModalOpen(false); }}>Guardar canvis</Button></div></Modal>
      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title={confirmAction?.title || 'Confirmació'}><div className="space-y-6 text-center"><div className="py-2"><p className="text-slate-600">{confirmAction?.message}</p></div>{confirmAction?.type === 'info' ? <Button onClick={() => setConfirmAction(null)} className="w-full">Entesos</Button> : <div className="flex gap-3"><Button variant="secondary" onClick={() => setConfirmAction(null)} className="flex-1">Cancel·lar</Button><Button variant="danger" onClick={executeConfirmation} className="flex-1" icon={Trash2}>Eliminar</Button></div>}</div></Modal>
      <Modal isOpen={!!settleModalOpen} onClose={() => setSettleModalOpen(null)} title="Confirmar Pagament">{settleModalOpen && <div className="space-y-6 text-center"><div className="py-4"><p className="text-slate-500 text-lg">Confirmar pagament de</p><p className="text-xl font-bold text-slate-800 my-2">{settleModalOpen.from} <ArrowRightLeft className="inline mx-2" size={16}/> {settleModalOpen.to}</p><p className="text-3xl font-black text-indigo-600">{formatCurrency(settleModalOpen.amount)}</p></div><div className="flex gap-2"><Button variant="secondary" onClick={() => setSettleModalOpen(null)} className="flex-1">Cancel·lar</Button><Button variant="success" onClick={handleSettleDebt} className="flex-1" icon={CheckCircle2}>Confirmar</Button></div></div>}</Modal>
      
      <style>{`@keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; } .scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}