import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, CheckCircle2, ArrowRightLeft, Loader2, AlertTriangle, Lock, LogOut, Wrench, UserPlus } from 'lucide-react';
import { User } from 'firebase/auth';

import Button from '../components/Button';
import Modal from '../components/Modal';
import Toast, { ToastType } from '../components/Toast';
import ExpenseModal from '../components/modals/ExpenseModal';
import GroupModal from '../components/modals/GroupModal';
import TripHeader from '../components/trip/TripHeader';
import ExpensesList from '../components/trip/ExpensesList';
import BalancesView from '../components/trip/BalancesView';
import SettlementsView from '../components/trip/SettlementsView';

import { TripService } from '../services/tripService';
import { useTripData } from '../hooks/useTripData';
import { useTripCalculations } from '../hooks/useTripCalculations';
import { CURRENCIES } from '../utils/constants'; 
import { CategoryId, Settlement, Expense, TripUser } from '../types';
import { generatePDF } from '../utils/exportPdf';
import { formatCurrency } from '../utils/formatters';

interface TripPageProps {
  user: User | null;
}

export default function TripPage({ user }: TripPageProps) {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  
  // Hooks de dades
  const { tripData, expenses, loading, error } = useTripData(tripId);

  // Estats de la Pàgina
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'settle'>('expenses');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<CategoryId | 'all'>('all');
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  
  // Estats dels Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settleModalOpen, setSettleModalOpen] = useState<Settlement | null>(null);
  
  // --- NOU: ESTATS PER AL MODAL DE GRUP (Pestanyes) ---
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupModalTab, setGroupModalTab] = useState<'members' | 'share'>('members');

  // Estats d'Edició/Acció
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; id?: string | number; title: string; message: string } | null>(null);
  const [settleMethod, setSettleMethod] = useState('Bizum');

  const [editTripName, setEditTripName] = useState('');
  const [editTripDate, setEditTripDate] = useState('');

  const showToast = (msg: string, type: ToastType = 'success') => setToast({ msg, type });

  // 1. Comprovem si l'usuari és membre realment (per mostrar banner convidat)
  const isMember = user && tripData?.memberUids?.includes(user.uid);

  useEffect(() => {
    if (tripData) {
        setEditTripName(tripData.name);
        setEditTripDate(tripData.createdAt ? new Date(tripData.createdAt).toISOString().split('T')[0] : '');
    }
  }, [tripData]);

  // Guardem l'últim viatge visitat
  useEffect(() => { if (tripId) localStorage.setItem('cc-last-trip-id', tripId); }, [tripId]);

  // --- MIGRATE ON LOAD (Legacy support) ---
  useEffect(() => {
      if (!tripData || !tripId) return;
      if (tripData.users.length > 0 && typeof tripData.users[0] === 'string') {
          // @ts-ignore
          const migratedUsers = tripData.users.map((name: any) => ({ id: crypto.randomUUID(), name: name }));
          const migratedExpenses = tripData.expenses.map(exp => {
              const payerUser = migratedUsers.find(u => u.name === exp.payer);
              const newInvolved = exp.involved.map(invName => {
                  const invUser = migratedUsers.find(u => u.name === invName);
                  return invUser ? invUser.id : invName;
              });
              return { ...exp, payer: payerUser ? payerUser.id : exp.payer, involved: newInvolved };
          });
          TripService.updateTrip(tripId, { users: migratedUsers, expenses: migratedExpenses })
            .then(() => window.location.reload());
      }
  }, [tripData, tripId]);

  const { users, currency = CURRENCIES[0], name, createdAt } = tripData || { users: [], expenses: [] };
  
  // Càlculs
  const { filteredExpenses, balances, categoryStats, settlements, totalGroupSpending, displayedTotal } = useTripCalculations(expenses, users || [], searchQuery, filterCategory);

  // --- ACCIONS ---

  const handleJoinTrip = async () => {
      if (!user || !tripId) return;
      try {
          await TripService.joinTripViaLink(tripId, user);
          showToast("T'has unit al grup!", 'success');
      } catch (e) {
          showToast("Error al unir-se", 'error');
      }
  };

  const handleUpdateTrip = async () => {
    if (!tripId) return;
    try {
        let d = createdAt ? new Date(createdAt) : new Date();
        if (editTripDate) d = new Date(editTripDate);
        d.setHours(12, 0, 0, 0);
        await TripService.updateTrip(tripId, { name: editTripName, createdAt: d.toISOString() });
        setSettingsModalOpen(false);
        showToast("Configuració actualitzada");
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleChangeCurrency = async (newCurrency: any) => {
      if (tripId) {
          await TripService.updateTrip(tripId, { currency: newCurrency });
          showToast("Moneda canviada");
      }
  };

  const handleSettleDebt = async () => {
    if (!settleModalOpen || !tripId) return;
    try {
        await TripService.settleDebt(tripId, settleModalOpen, settleMethod);
        setSettleModalOpen(null);
        showToast("Pagament registrat!", 'success');
    } catch (e: any) { showToast("Error liquidant", 'error'); }
  };

  // Funció segura per sortir del grup
  const handleLeaveTrip = async () => {
      if (!confirm("Segur que vols deixar de veure aquest grup?")) return;
      if (!user || !tripId) return;

      try {
          // Busquem l'ID intern de l'usuari actual
          const currentUser = users.find(u => u.linkedUid === user.uid);
          
          if (currentUser) {
            await TripService.leaveTrip(tripId, currentUser.id);
            localStorage.removeItem('cc-last-trip-id');
            window.location.href = '/'; 
          } else {
             // Si no trobem l'usuari intern però té accés, li treiem l'accés d'emergència
             // @ts-ignore
             if (TripService.removeMemberAccess) {
                 // @ts-ignore
                 await TripService.removeMemberAccess(tripId, user.uid);
                 window.location.href = '/';
             } else {
                 showToast("No s'ha trobat el teu usuari al grup", 'error');
             }
          }
      } catch (error) { 
          console.error(error);
          showToast("Error al sortir del grup", 'error'); 
      }
  };

  const handleForceMigration = async () => {
      if (!tripData || !tripId) return;
      if (!confirm("Això intentarà arreglar les despeses antigues que surten amb '???'. Continuar?")) return;
      try {
          const currentUsers = tripData.users as TripUser[];
          const fixedExpenses = tripData.expenses.map(exp => {
                const payerUser = currentUsers.find(u => u.name === exp.payer);
                const newInvolved = exp.involved.map(invVal => {
                    const invUser = currentUsers.find(u => u.name === invVal);
                    return invUser ? invUser.id : invVal;
                });
                let newSplitDetails = {};
                if (exp.splitDetails) {
                    newSplitDetails = Object.fromEntries(Object.entries(exp.splitDetails).map(([key, val]) => {
                        const u = currentUsers.find(user => user.name === key);
                        return [u ? u.id : key, val];
                    }));
                }
                return {
                    ...exp,
                    payer: payerUser ? payerUser.id : exp.payer,
                    involved: newInvolved,
                    splitDetails: newSplitDetails
                };
          });
          await TripService.updateTrip(tripId, { expenses: fixedExpenses });
          showToast("Reparació completada!", 'success');
          setSettingsModalOpen(false);
      } catch (e) { showToast("Error durant la reparació", 'error'); }
  };

  const executeConfirmation = async () => {
    if (!confirmAction || !tripId) return;
    try {
      if (confirmAction.type === 'delete_expense') {
        await TripService.deleteExpense(tripId, String(confirmAction.id));
        showToast("Despesa eliminada", 'success');
      }
    } catch (e: any) { showToast("Error: " + e.message, 'error'); }
    setConfirmAction(null); 
    setIsExpenseModalOpen(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600"/></div>;
  if (error) return <div className="min-h-screen flex flex-col items-center justify-center gap-4"><AlertTriangle className="text-red-500" size={40}/><p className="text-slate-600 font-bold">{error}</p><Button variant="secondary" onClick={() => { localStorage.removeItem('cc-last-trip-id'); navigate('/'); }}>Tornar a l'inici</Button></div>;
  if (!tripData) return null;
  const canChangeCurrency = expenses.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 md:pb-10">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      <TripHeader 
        tripId={tripId!} name={name} createdAt={createdAt} userCount={users.filter(u => !u.isDeleted).length}
        displayedTotal={displayedTotal} totalGroupSpending={totalGroupSpending} currency={currency}
        isFiltered={!!searchQuery || filterCategory !== 'all'}
        onOpenSettings={() => setSettingsModalOpen(true)}
        
        // Obre modal en pestanya 'Membres'
        onOpenGroup={() => {
            setGroupModalTab('members');
            setGroupModalOpen(true);
        }}
        
        onExportPDF={() => generatePDF(name, expenses, balances, settlements, users, currency.symbol)}
        
        // Obre modal en pestanya 'Compartir'
        onOpenShare={() => { 
            setGroupModalTab('share');
            setGroupModalOpen(true);
        }}
      />

      {/* BANNER DE CONVIDAT */}
      {!isMember && user && (
          <div className="bg-indigo-600 text-white px-4 py-3 text-center shadow-md relative z-30 animate-fade-in">
              <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
                  <p className="text-sm font-medium">Estàs veient aquest viatge com a convidat.</p>
                  <button onClick={handleJoinTrip} className="bg-white text-indigo-600 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm hover:bg-indigo-50 transition-colors flex items-center gap-1">
                    <UserPlus size={14}/> Unir-me al grup
                  </button>
              </div>
          </div>
      )}

      <main className="max-w-3xl mx-auto px-4 relative z-20 mt-6">
        <div className="flex p-1.5 bg-white rounded-2xl mb-6 shadow-sm border border-slate-200">
          {(['expenses', 'balances', 'settle'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === tab ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>{tab === 'expenses' ? 'Despeses' : tab === 'balances' ? 'Balanç' : 'Liquidar'}</button>
          ))}
        </div>

        {activeTab === 'expenses' && <ExpensesList expenses={filteredExpenses} searchQuery={searchQuery} setSearchQuery={setSearchQuery} filterCategory={filterCategory} setFilterCategory={setFilterCategory} onEdit={(e) => { setEditingExpense(e); setIsExpenseModalOpen(true); }} currency={currency} users={users} />}
        {activeTab === 'balances' && <BalancesView balances={balances} categoryStats={categoryStats} currency={currency} users={users} />}
        {activeTab === 'settle' && <SettlementsView settlements={settlements} onSettle={setSettleModalOpen} currency={currency} users={users} />}
      </main>
      
      <button onClick={() => { setEditingExpense(null); setIsExpenseModalOpen(true); }} className="fixed bottom-6 right-6 md:right-[calc(50%-350px)] bg-indigo-600 text-white p-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all z-40 shadow-indigo-200"><Plus size={28} /></button>
      
      {/* MODALS */}
      <ExpenseModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} initialData={editingExpense} users={users} currency={currency} tripId={tripId!} onDelete={(id) => setConfirmAction({ type: 'delete_expense', id, title: 'Eliminar?', message: 'Segur?' })} showToast={showToast} />
      
      {/* GROUP MODAL AMB PESTANYA INICIAL */}
      <GroupModal 
        isOpen={groupModalOpen} 
        onClose={() => setGroupModalOpen(false)} 
        trip={tripData} 
        showToast={showToast} 
        onUpdateTrip={() => { /* Firebase auto-updates */ }} 
        initialTab={groupModalTab}
      />
      
      <Modal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} title="Configuració del Grup">
        <div className="space-y-6">
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nom</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={editTripName} onChange={e => setEditTripName(e.target.value)} /></div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Data</label><input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={editTripDate} onChange={e => setEditTripDate(e.target.value)} /></div>
          
          <div>
            <div className="flex items-center justify-between mb-2"><label className="block text-xs font-bold text-slate-500 uppercase">Moneda</label>{!canChangeCurrency && <span className="text-xs text-rose-500 font-bold flex items-center gap-1"><Lock size={10} /> Bloquejat</span>}</div>
            <div className="grid grid-cols-2 gap-2">
              {CURRENCIES.map(c => (<button key={c.code} onClick={() => canChangeCurrency && handleChangeCurrency(c)} disabled={!canChangeCurrency} className={`p-3 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition-all ${currency?.code === c.code ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100'} ${!canChangeCurrency && currency?.code !== c.code ? 'opacity-40 cursor-not-allowed bg-slate-50' : 'hover:border-slate-300'}`}><span>{c.symbol}</span> {c.code}</button>))}
            </div>
          </div>
          <Button onClick={handleUpdateTrip}>Guardar canvis</Button>

          <div className="border-t border-slate-100 pt-4 space-y-3">
             <h4 className="text-xs font-bold text-slate-400 uppercase">Zona de Perill</h4>
             <button onClick={handleForceMigration} className="w-full p-3 flex items-center justify-center gap-2 text-amber-600 bg-amber-50 hover:bg-amber-100 font-bold rounded-xl transition-colors">
                <Wrench size={18}/> Reparar Dades Antigues
             </button>
             <button onClick={handleLeaveTrip} className="w-full p-3 flex items-center justify-center gap-2 text-rose-600 bg-rose-50 hover:bg-rose-100 font-bold rounded-xl transition-colors">
                <LogOut size={18}/> Abandonar Grup
             </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title={confirmAction?.title || 'Confirmació'}><div className="space-y-6 text-center"><div className="py-2"><p className="text-slate-600">{confirmAction?.message}</p></div>{confirmAction?.type === 'info' ? <Button onClick={() => setConfirmAction(null)} className="w-full">Entesos</Button> : <div className="flex gap-3"><Button variant="secondary" onClick={() => setConfirmAction(null)} className="flex-1">Cancel·lar</Button><Button variant="danger" onClick={executeConfirmation} className="flex-1" icon={Trash2}>Eliminar</Button></div>}</div></Modal>
      <Modal isOpen={!!settleModalOpen} onClose={() => setSettleModalOpen(null)} title="Confirmar Pagament">
        {settleModalOpen && (
          <div className="space-y-6 text-center">
            <div className="py-4">
              <p className="text-slate-500 text-lg">Confirmar pagament de</p>
              <p className="text-xl font-bold text-slate-800 my-2">{users.find(u => u.id === settleModalOpen.from)?.name} <ArrowRightLeft className="inline mx-2" size={16}/> {users.find(u => u.id === settleModalOpen.to)?.name}</p>
              <p className="text-3xl font-black text-indigo-600">{formatCurrency(settleModalOpen.amount, currency)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Com s'ha pagat?</p>
              <div className="flex justify-center gap-2 flex-wrap">{['Bizum', 'Efectiu', 'Transferència', 'PayPal'].map(method => (<button key={method} onClick={() => setSettleMethod(method)} className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-all ${settleMethod === method ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-500 hover:border-slate-300'}`}>{method}</button>))}</div>
            </div>
            <div className="flex gap-2"><Button variant="secondary" onClick={() => setSettleModalOpen(null)} className="flex-1">Cancel·lar</Button><Button variant="success" onClick={handleSettleDebt} className="flex-1" icon={CheckCircle2}>Confirmar</Button></div>
          </div>
        )}
      </Modal>
      <style>{`@keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }`}</style>
    </div>
  );
}