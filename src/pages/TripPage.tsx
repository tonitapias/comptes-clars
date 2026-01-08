import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, CheckCircle2, ArrowRightLeft, Loader2, AlertTriangle, Lock, LogOut, UserPlus, Wallet, Receipt, History } from 'lucide-react'; 
import { User } from 'firebase/auth';

import Button from '../components/Button';
import Modal from '../components/Modal';
import Toast, { ToastType } from '../components/Toast';
import ExpenseModal from '../components/modals/ExpenseModal';
import GroupModal from '../components/modals/GroupModal';
import ActivityModal from '../components/modals/ActivityModal';
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
  
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [groupModalTab, setGroupModalTab] = useState<'members' | 'share'>('members');

  // Estats d'Edició/Acció
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; id?: string | number; title: string; message: string } | null>(null);
  const [settleMethod, setSettleMethod] = useState('Bizum');

  const [editTripName, setEditTripName] = useState('');
  const [editTripDate, setEditTripDate] = useState('');

  const showToast = (msg: string, type: ToastType = 'success') => setToast({ msg, type });

  const isMember = user && tripData?.memberUids?.includes(user.uid);

  // --- EFECTES ---

  useEffect(() => {
    if (tripData) {
        setEditTripName(tripData.name);
        // Si createdAt no existeix (cas molt vell), posem avui
        const dateStr = tripData.createdAt ? tripData.createdAt : new Date().toISOString();
        setEditTripDate(dateStr.split('T')[0]);
    }
  }, [tripData]);

  useEffect(() => { if (tripId) localStorage.setItem('cc-last-trip-id', tripId); }, [tripId]);

  // --- MIGRACIÓ AUTOMÀTICA (SILENT FIX) ---
  useEffect(() => {
      if (!tripData || !tripId) return;

      const performMigration = async () => {
          let needsUpdate = false;
          let newUsers = [...tripData.users];
          let newExpenses = [...tripData.expenses];

          // 1. Migració d'Usuaris (String -> Objecte)
          if (newUsers.length > 0 && typeof newUsers[0] === 'string') {
              // @ts-ignore
              newUsers = newUsers.map((name: any) => ({ 
                  id: crypto.randomUUID(), 
                  name: name,
                  isDeleted: false 
              }));
              needsUpdate = true;
          }

          // 2. Reparació de Despeses (Noms -> IDs)
          const userIds = newUsers.map(u => u.id);
          // Detectem si hi ha despeses on el pagador no és un ID conegut
          const hasBrokenExpenses = newExpenses.some(exp => !userIds.includes(exp.payer));

          if (hasBrokenExpenses) {
              needsUpdate = true;
              newExpenses = newExpenses.map(exp => {
                  const payerUser = newUsers.find(u => u.name === exp.payer);
                  
                  const newInvolved = exp.involved.map(invVal => {
                      const invUser = newUsers.find(u => u.name === invVal);
                      return invUser ? invUser.id : invVal;
                  });

                  let newSplitDetails = {};
                  if (exp.splitDetails) {
                      newSplitDetails = Object.fromEntries(Object.entries(exp.splitDetails).map(([key, val]) => {
                          const u = newUsers.find(user => user.name === key);
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
          }

          if (needsUpdate) {
              console.log("🛠️ Reparació automàtica de dades antigues executada.");
              try {
                  await TripService.updateTrip(tripId, { users: newUsers, expenses: newExpenses });
                  window.location.reload();
              } catch (e) {
                  console.error("Error en la migració automàtica", e);
              }
          }
      };

      performMigration();
  }, [tripData, tripId]);

  const { users, currency = CURRENCIES[0], name, createdAt, logs = [] } = tripData || { users: [], expenses: [] };
  
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

  const handleLeaveTrip = async () => {
      if (!confirm("Segur que vols deixar de veure aquest grup?")) return;
      if (!user || !tripId) return;

      try {
          const currentUser = users.find(u => u.linkedUid === user.uid);
          
          if (currentUser) {
            await TripService.leaveTrip(tripId, currentUser.id);
            localStorage.removeItem('cc-last-trip-id');
            window.location.href = '/'; 
          } else {
             // @ts-ignore
             if (TripService.removeMemberAccess) {
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400"/></div>;
  if (error) return <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950"><AlertTriangle className="text-red-500" size={40}/><p className="text-slate-600 dark:text-slate-300 font-bold">{error}</p><Button variant="secondary" onClick={() => { localStorage.removeItem('cc-last-trip-id'); navigate('/'); }}>Tornar a l'inici</Button></div>;
  if (!tripData) return null;
  const canChangeCurrency = expenses.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 pb-24 md:pb-10 transition-colors duration-300">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      <TripHeader 
        tripId={tripId!} name={name} createdAt={createdAt} userCount={users.filter(u => !u.isDeleted).length}
        displayedTotal={displayedTotal} totalGroupSpending={totalGroupSpending} currency={currency}
        isFiltered={!!searchQuery || filterCategory !== 'all'}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenGroup={() => { setGroupModalTab('members'); setGroupModalOpen(true); }}
        onExportPDF={() => generatePDF(name, expenses, balances, settlements, users, currency.symbol)}
        onOpenShare={() => { setGroupModalTab('share'); setGroupModalOpen(true); }}
      />

      {!isMember && user && (
          <div className="bg-indigo-600 dark:bg-indigo-700 text-white px-4 py-3 text-center shadow-md relative z-30 animate-fade-in">
              <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
                  <p className="text-sm font-medium">Estàs veient aquest viatge com a convidat.</p>
                  <button onClick={handleJoinTrip} className="bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1">
                    <UserPlus size={14}/> Unir-me al grup
                  </button>
              </div>
          </div>
      )}

      <main className="max-w-3xl mx-auto px-4 relative z-20 mt-6">
        <div className="flex p-1.5 bg-white dark:bg-slate-900 rounded-2xl mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
          {(['expenses', 'balances', 'settle'] as const).map(tab => (
            <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2
                ${activeTab === tab 
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
            >
                {tab === 'expenses' && <Receipt size={16} />}
                {tab === 'balances' && <Wallet size={16} />}
                {tab === 'settle' && <CheckCircle2 size={16} />}
                <span className="hidden sm:inline">
                    {tab === 'expenses' ? 'Despeses' : tab === 'balances' ? 'Balanç' : 'Liquidar'}
                </span>
                <span className="sm:hidden">
                    {tab === 'expenses' ? 'Llista' : tab === 'balances' ? 'Balanç' : 'Deutes'}
                </span>
            </button>
          ))}
        </div>

        {/* --- EMPTY STATE --- */}
        {activeTab === 'expenses' && expenses.length === 0 && !searchQuery && filterCategory === 'all' ? (
             <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-full mb-4">
                    <Receipt size={48} className="text-indigo-400 dark:text-indigo-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">No hi ha despeses</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-xs mb-6">Afegeix la primera despesa per començar a dividir comptes.</p>
                <Button onClick={() => { setEditingExpense(null); setIsExpenseModalOpen(true); }} icon={Plus}>Afegir Despesa</Button>
             </div>
        ) : (
            <>
                {activeTab === 'expenses' && <ExpensesList expenses={filteredExpenses} searchQuery={searchQuery} setSearchQuery={setSearchQuery} filterCategory={filterCategory} setFilterCategory={setFilterCategory} onEdit={(e) => { setEditingExpense(e); setIsExpenseModalOpen(true); }} currency={currency} users={users} />}
            </>
        )}

        {activeTab === 'balances' && <BalancesView balances={balances} categoryStats={categoryStats} currency={currency} users={users} />}
        {activeTab === 'settle' && <SettlementsView settlements={settlements} onSettle={setSettleModalOpen} currency={currency} users={users} />}
      </main>
      
      <button onClick={() => { setEditingExpense(null); setIsExpenseModalOpen(true); }} className="fixed bottom-6 right-6 md:right-[calc(50%-350px)] bg-indigo-600 text-white p-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all z-40 shadow-indigo-200 dark:shadow-none active:scale-95"><Plus size={28} /></button>
      
      <ExpenseModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} initialData={editingExpense} users={users} currency={currency} tripId={tripId!} onDelete={(id) => setConfirmAction({ type: 'delete_expense', id, title: 'Eliminar?', message: 'Segur?' })} showToast={showToast} />
      <GroupModal isOpen={groupModalOpen} onClose={() => setGroupModalOpen(false)} trip={tripData} showToast={showToast} onUpdateTrip={() => {}} initialTab={groupModalTab}/>
      
      <ActivityModal isOpen={activityModalOpen} onClose={() => setActivityModalOpen(false)} logs={logs} />

      <Modal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} title="Configuració del Grup">
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Nom</label>
            <input type="text" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 ring-indigo-500/20 transition-all" value={editTripName} onChange={e => setEditTripName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Data</label>
            <input type="date" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 ring-indigo-500/20 transition-all" value={editTripDate} onChange={e => setEditTripDate(e.target.value)} />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2"><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Moneda</label>{!canChangeCurrency && <span className="text-xs text-rose-500 font-bold flex items-center gap-1"><Lock size={10} /> Bloquejat</span>}</div>
            <div className="grid grid-cols-2 gap-2">
              {CURRENCIES.map(c => (
                  <button key={c.code} onClick={() => canChangeCurrency && handleChangeCurrency(c)} disabled={!canChangeCurrency} 
                  className={`p-3 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition-all 
                  ${currency?.code === c.code 
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' 
                      : 'border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300'} 
                  ${!canChangeCurrency && currency?.code !== c.code ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-800' : 'hover:border-slate-300 dark:hover:border-slate-600'}`}>
                      <span>{c.symbol}</span> {c.code}
                  </button>
              ))}
            </div>
          </div>
          <Button onClick={handleUpdateTrip}>Guardar canvis</Button>

          {/* HISTORIAL */}
          <button onClick={() => { setSettingsModalOpen(false); setActivityModalOpen(true); }} className="w-full p-3 flex items-center justify-center gap-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold rounded-xl transition-colors">
              <History size={18}/> Veure Historial d'Activitat
          </button>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
             <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Zona de Perill</h4>
             {/* BOTÓ REPARAR ELIMINAT */}
             <button onClick={handleLeaveTrip} className="w-full p-3 flex items-center justify-center gap-2 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 font-bold rounded-xl transition-colors">
                <LogOut size={18}/> Abandonar Grup
             </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title={confirmAction?.title || 'Confirmació'}><div className="space-y-6 text-center"><div className="py-2"><p className="text-slate-600 dark:text-slate-300">{confirmAction?.message}</p></div>{confirmAction?.type === 'info' ? <Button onClick={() => setConfirmAction(null)} className="w-full">Entesos</Button> : <div className="flex gap-3"><Button variant="secondary" onClick={() => setConfirmAction(null)} className="flex-1">Cancel·lar</Button><Button variant="danger" onClick={executeConfirmation} className="flex-1" icon={Trash2}>Eliminar</Button></div>}</div></Modal>
      
      <Modal isOpen={!!settleModalOpen} onClose={() => setSettleModalOpen(null)} title="Confirmar Pagament">
        {settleModalOpen && (
          <div className="space-y-6 text-center">
            <div className="py-4">
              <p className="text-slate-500 dark:text-slate-400 text-lg">Confirmar pagament de</p>
              <p className="text-xl font-bold text-slate-800 dark:text-white my-2">{users.find(u => u.id === settleModalOpen.from)?.name} <ArrowRightLeft className="inline mx-2" size={16}/> {users.find(u => u.id === settleModalOpen.to)?.name}</p>
              <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(settleModalOpen.amount, currency)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">Com s'ha pagat?</p>
              <div className="flex justify-center gap-2 flex-wrap">
                  {['Bizum', 'Efectiu', 'Transferència', 'PayPal'].map(method => (
                      <button key={method} onClick={() => setSettleMethod(method)} 
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-all 
                      ${settleMethod === method 
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' 
                          : 'border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                          {method}
                      </button>
                  ))}
              </div>
            </div>
            <div className="flex gap-2"><Button variant="secondary" onClick={() => setSettleModalOpen(null)} className="flex-1">Cancel·lar</Button><Button variant="success" onClick={handleSettleDebt} className="flex-1" icon={CheckCircle2}>Confirmar</Button></div>
          </div>
        )}
      </Modal>
      <style>{`@keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }`}</style>
    </div>
  );
}