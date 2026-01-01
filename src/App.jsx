import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import { 
  Plus, Users, Receipt, ArrowRightLeft, Trash2, X, 
  CheckCircle2, ChevronRight, Utensils, Car, Home, Beer, 
  Plane, ShoppingBag, Music, HelpCircle, Search, Filter, 
  Edit2, PieChart as PieChartIcon, Info, Settings,
  Share2, LogOut, Loader2, Cloud, Banknote, Check, Copy, Calendar, Ticket, AlertTriangle
} from 'lucide-react';

// Components (Assegura't de tenir-los a la carpeta components/)
import Card from './components/Card';
import Button from './components/Button';
import Modal from './components/Modal';
import DonutChart from './components/DonutChart';

// Firebase
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, onSnapshot, setDoc, updateDoc
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// --- CONFIGURACIÓ ---
const CATEGORIES = [
  { id: 'all', label: 'Totes', icon: Filter, color: 'bg-slate-100 text-slate-600', barColor: 'bg-slate-400' },
  { id: 'food', label: 'Menjar', icon: Utensils, color: 'bg-orange-100 text-orange-600', barColor: 'bg-orange-500' },
  { id: 'transport', label: 'Transport', icon: Car, color: 'bg-blue-100 text-blue-600', barColor: 'bg-blue-500' },
  { id: 'home', label: 'Allotjament', icon: Home, color: 'bg-indigo-100 text-indigo-600', barColor: 'bg-indigo-500' },
  { id: 'drinks', label: 'Festa', icon: Beer, color: 'bg-purple-100 text-purple-600', barColor: 'bg-purple-500' },
  { id: 'travel', label: 'Viatge', icon: Plane, color: 'bg-sky-100 text-sky-600', barColor: 'bg-sky-500' },
  { id: 'tickets', label: 'Entrades', icon: Ticket, color: 'bg-rose-100 text-rose-600', barColor: 'bg-rose-500' },
  { id: 'shopping', label: 'Compres', icon: ShoppingBag, color: 'bg-pink-100 text-pink-600', barColor: 'bg-pink-500' },
  { id: 'entertainment', label: 'Oci', icon: Music, color: 'bg-teal-100 text-teal-600', barColor: 'bg-teal-500' },
  { id: 'transfer', label: 'Transferència', icon: Banknote, color: 'bg-emerald-100 text-emerald-600', barColor: 'bg-emerald-500' },
  { id: 'other', label: 'Altres', icon: HelpCircle, color: 'bg-slate-100 text-slate-600', barColor: 'bg-slate-500' },
];

const CURRENCIES = [
  { code: 'EUR', symbol: '€', locale: 'ca-ES' },
  { code: 'USD', symbol: '$', locale: 'en-US' },
  { code: 'GBP', symbol: '£', locale: 'en-GB' },
  { code: 'JPY', symbol: '¥', locale: 'ja-JP' },
  { code: 'MXN', symbol: '$', locale: 'es-MX' },
];

// Configuració segura amb .env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'comptes-clars-v1';

// --- APP ROOT (Gestor de Rutes) ---

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!firebaseConfig.apiKey) return;
    signInAnonymously(auth).catch((e) => console.error("Auth Error", e));
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  if (!firebaseConfig.apiKey) return <div className="p-10 text-center">Falta configurar .env.local</div>;
  if (!user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;

  return (
    <Routes>
      <Route path="/" element={<LandingScreen user={user} />} />
      <Route path="/trip/:tripId" element={<TripPage user={user} />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

// --- PÀGINA: LANDING (Crear / Unir-se) ---

function LandingScreen({ user }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('menu');
  const [inputName, setInputName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. SI JA TENIM VIATGE GUARDAT, HI ANEM DIRECTES
  useEffect(() => {
    const savedTrip = localStorage.getItem('cc-last-trip-id');
    if (savedTrip) {
      navigate(`/trip/${savedTrip}`);
    }
  }, []);

  const createTrip = async () => {
    setLoading(true);
    try {
      const newId = Math.random().toString(36).substring(2, 9);
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${newId}`), { 
        id: newId, 
        name: inputName, 
        users: [creatorName], 
        expenses: [], 
        currency: CURRENCIES[0], 
        createdAt: new Date().toISOString() 
      });
      navigate(`/trip/${newId}`);
    } catch (e) {
      alert("Error: " + e.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-b-[50%] scale-150 -translate-y-1/2"></div>
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
           <div className="bg-white/20 backdrop-blur-md w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-white/30"><Cloud className="text-white" size={40} /></div>
           <h1 className="text-4xl font-black text-slate-800 mb-2">Comptes Clars</h1>
           <p className="text-slate-500 font-medium">Gestiona les despeses en grup.</p>
        </div>
        
        <Card className="p-8 shadow-xl border-0">
          {mode === 'menu' && (
            <div className="space-y-4">
              <Button onClick={() => setMode('create')} className="w-full py-4 text-lg">Crear nou viatge</Button>
              <Button variant="secondary" onClick={() => setMode('join')} className="w-full py-4 text-lg">Tinc un codi</Button>
            </div>
          )}
          {mode === 'create' && (
            <div className="space-y-4 animate-fade-in">
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Nom del viatge</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={inputName} onChange={e => setInputName(e.target.value)} /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">El teu nom</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={creatorName} onChange={e => setCreatorName(e.target.value)} /></div>
              <div className="flex gap-2 pt-2"><Button variant="ghost" onClick={() => setMode('menu')}>Enrere</Button><Button className="flex-1" loading={loading} disabled={!inputName || !creatorName} onClick={createTrip}>Començar</Button></div>
            </div>
          )}
          {mode === 'join' && (
            <div className="space-y-4 animate-fade-in">
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Codi del viatge</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-center text-lg uppercase" value={inputCode} onChange={e => setInputCode(e.target.value)} /></div>
              <div className="flex gap-2 pt-2"><Button variant="ghost" onClick={() => setMode('menu')}>Enrere</Button><Button className="flex-1" disabled={inputCode.length < 3} onClick={() => navigate(`/trip/${inputCode}`)}>Entrar</Button></div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// --- PÀGINA: VISTA VIATGE (Data Fetching + UI) ---

function TripPage({ user }) {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [tripData, setTripData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. GUARDEM EL VIATGE A MEMÒRIA QUAN HI ENTREM
  useEffect(() => {
    if (tripId) {
      localStorage.setItem('cc-last-trip-id', tripId);
    }
  }, [tripId]);

  useEffect(() => {
    setLoading(true);
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTripData({ name: data.name, users: data.users || [], expenses: data.expenses || [], currency: data.currency || CURRENCIES[0], createdAt: data.createdAt });
        setLoading(false);
      } else {
        setError("Viatge no trobat");
        setLoading(false);
      }
    }, (err) => { console.error(err); setError(err.message); setLoading(false); });
    return () => unsubscribe();
  }, [tripId]);

  const updateTrip = async (newData) => {
    try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`), newData); }
    catch (e) { alert("Error guardant: " + e.message); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600"/></div>;
  if (error) return <div className="min-h-screen flex flex-col items-center justify-center gap-4"><AlertTriangle className="text-red-500" size={40}/><p className="text-slate-600 font-bold">{error}</p><Button variant="secondary" onClick={() => navigate('/')}>Tornar a l'inici</Button></div>;

  return (
    <MainApp 
      tripData={tripData} 
      tripId={tripId} 
      onUpdate={updateTrip} 
      // 3. QUAN CLIQUEM A SORTIR, ESBORREM LA MEMÒRIA
      onExit={() => { 
        localStorage.removeItem('cc-last-trip-id'); 
        navigate('/'); 
      }} 
    />
  );
}

// --- COMPONENT PRINCIPAL DE LA UI (Pura presentació) ---

function MainApp({ tripData, tripId, onUpdate, onExit }) {
  const { users, expenses, currency = CURRENCIES[0], name, createdAt } = tripData;
  const [activeTab, setActiveTab] = useState('expenses');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settleModalOpen, setSettleModalOpen] = useState(null); 
  const [userDetailModalOpen, setUserDetailModalOpen] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); 
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [newExpense, setNewExpense] = useState({ title: '', amount: '', payer: '', category: 'food', involved: [], date: '' });
  const [newUserName, setNewUserName] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editTripName, setEditTripName] = useState(name);
  const [editTripDate, setEditTripDate] = useState('');
  const [copied, setCopied] = useState(false);

  // --- HELPERS & LOGIC ---
  const formatCurrency = (amount) => new Intl.NumberFormat(currency?.locale || 'ca-ES', { style: 'currency', currency: currency?.code || 'EUR' }).format(amount);
  const getCategory = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[10];
  const formatDateDisplay = (d) => d ? new Date(d).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' }) : '';
  
  const copyCode = () => {
    navigator.clipboard.writeText(tripId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
    .catch(() => { const ta = document.createElement("textarea"); ta.value = tripId; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
        const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.payer.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === 'all' || e.category === filterCategory;
        return matchesSearch && matchesCategory;
      }).sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);
  }, [expenses, searchQuery, filterCategory]);

  const balances = useMemo(() => {
    const balanceMap = {}; users.forEach(u => balanceMap[u] = 0);
    expenses.forEach(exp => {
      if (balanceMap[exp.payer] !== undefined) balanceMap[exp.payer] += exp.amount;
      if (exp.category === 'transfer') {
         exp.involved.forEach(p => { if (balanceMap[p] !== undefined) balanceMap[p] -= exp.amount; });
      } else {
         const splitCount = exp.involved?.length || users.length;
         const splitAmount = splitCount > 0 ? exp.amount / splitCount : 0;
         const participants = exp.involved?.length > 0 ? exp.involved : users;
         participants.forEach(p => { if (balanceMap[p] !== undefined) balanceMap[p] -= splitAmount; });
      }
    });
    return users.map(user => ({ user, balance: balanceMap[user] })).sort((a, b) => b.balance - a.balance);
  }, [users, expenses]);

  const categoryStats = useMemo(() => {
    const stats = {};
    const total = expenses.filter(e => e.category !== 'transfer').reduce((acc, curr) => acc + curr.amount, 0);
    if (total === 0) return [];
    expenses.filter(e => e.category !== 'transfer').forEach(exp => {
      const catKey = exp.category || 'other';
      if (!stats[catKey]) stats[catKey] = 0;
      stats[catKey] += exp.amount;
    });
    return Object.entries(stats).map(([id, amount]) => {
      const catInfo = CATEGORIES.find(c => c.id === id) || CATEGORIES[10];
      return { id, amount, ...catInfo, percentage: (amount / total) * 100 };
    }).sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const settlements = useMemo(() => {
    let debts = [];
    let debtors = balances.filter(b => b.balance < -0.01).map(b => ({ ...b }));
    let creditors = balances.filter(b => b.balance > 0.01).map(b => ({ ...b }));
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      let debtor = debtors[i]; let creditor = creditors[j];
      let amount = Math.min(Math.abs(debtor.balance), creditor.balance);
      debts.push({ from: debtor.user, to: creditor.user, amount });
      debtor.balance += amount; creditor.balance -= amount;
      if (Math.abs(debtor.balance) < 0.01) i++; if (creditor.balance < 0.01) j++;
    }
    return debts;
  }, [balances]);

  const totalGroupSpending = expenses.filter(e => e.category !== 'transfer').reduce((acc, curr) => acc + curr.amount, 0);

  // --- HANDLERS ---
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount) return;
    let finalDate = newExpense.date ? new Date(newExpense.date) : new Date(); finalDate.setHours(12, 0, 0, 0);
    const expenseData = {
      id: editingId || Date.now(), title: newExpense.title, amount: parseFloat(newExpense.amount),
      payer: newExpense.payer || users[0], category: newExpense.category,
      involved: newExpense.involved.length > 0 ? newExpense.involved : users, date: finalDate.toISOString()
    };
    const newExpensesList = editingId ? expenses.map(exp => exp.id === editingId ? expenseData : exp) : [expenseData, ...expenses];
    await onUpdate({ expenses: newExpensesList }); closeModal();
  };

  const deleteExpense = (id, e) => { e.stopPropagation(); setConfirmAction({ type: 'delete_expense', id: id, title: 'Eliminar Despesa', message: 'Estàs segur?' }); };
  const executeConfirmation = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'delete_expense') await onUpdate({ expenses: expenses.filter(exp => exp.id !== confirmAction.id) });
    else if (confirmAction.type === 'delete_user') await onUpdate({ users: users.filter(u => u !== confirmAction.id) });
    setConfirmAction(null); closeModal();
  };
  const handleSettleDebt = async () => {
    if (!settleModalOpen) return;
    const repayment = { id: Date.now(), title: `Pagament deute`, amount: settleModalOpen.amount, payer: settleModalOpen.from, category: 'transfer', involved: [settleModalOpen.to], date: new Date().toISOString() };
    await onUpdate({ expenses: [repayment, ...expenses] }); setSettleModalOpen(null);
  };
  const handleAddUser = async (e) => { e.preventDefault(); if (newUserName && !users.includes(newUserName)) { await onUpdate({ users: [...users, newUserName] }); setNewUserName(''); } };
  const handleDeleteUser = (userName) => {
    if (expenses.some(e => e.payer === userName || e.involved.includes(userName))) setConfirmAction({ type: 'info', title: 'Acció no permesa', message: "Aquest usuari té despeses assignades." });
    else setConfirmAction({ type: 'delete_user', id: userName, title: 'Eliminar Participant', message: `Segur que vols eliminar a ${userName}?` });
  };
  const handleRenameUser = async (e) => {
    e.preventDefault(); if (!editingUser?.newName || users.includes(editingUser.newName)) return;
    const { oldName, newName } = editingUser;
    const newUsers = users.map(u => u === oldName ? newName : u);
    const newExpenses = expenses.map(exp => ({ ...exp, payer: exp.payer === oldName ? newName : exp.payer, involved: exp.involved.map(inv => inv === oldName ? newName : inv) }));
    await onUpdate({ users: newUsers, expenses: newExpenses }); setEditingUser(null);
  };
  const handleUpdateSettings = async () => {
    let d = createdAt ? new Date(createdAt) : new Date(); if (editTripDate) d = new Date(editTripDate); d.setHours(12, 0, 0, 0);
    await onUpdate({ name: editTripName, currency: currency, createdAt: d.toISOString() }); setSettingsModalOpen(false);
  };
  const closeModal = () => { setIsModalOpen(false); setEditingId(null); setNewExpense({ title: '', amount: '', payer: users[0], category: 'food', involved: [], date: '' }); };
  const openEditModal = (expense) => { setNewExpense({ ...expense, date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : '' }); setEditingId(expense.id); setIsModalOpen(true); };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 md:pb-10">
      {copied && <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg z-[60] flex items-center gap-2 animate-fade-in font-bold"><CheckCircle2 size={18} /> Codi copiat!</div>}
      <header className="bg-gradient-to-br from-indigo-800 to-indigo-600 text-white pt-8 pb-20 px-6 shadow-xl relative overflow-hidden">
        <div className="max-w-3xl mx-auto flex justify-between items-start relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2"><button className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors" onClick={onExit}><LogOut className="text-indigo-100" size={16} /></button><span className="text-indigo-200 text-xs font-bold tracking-wider uppercase">En línia • {tripId}</span></div>
            <h1 className="text-2xl font-bold tracking-tight cursor-pointer hover:opacity-90" onClick={() => { setEditTripName(name); setEditTripDate(createdAt ? new Date(createdAt).toISOString().split('T')[0] : ''); setSettingsModalOpen(true); }}>{name} <Edit2 size={16} className="inline opacity-50"/></h1>
            {createdAt && <p className="text-indigo-200 text-xs mt-1 flex items-center gap-1 opacity-80"><Calendar size={12} /> {new Date(createdAt).toLocaleDateString('ca-ES', { dateStyle: 'long' })}</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setEditTripName(name); setEditTripDate(createdAt ? new Date(createdAt).toISOString().split('T')[0] : ''); setSettingsModalOpen(true); }} className="bg-white/20 hover:bg-white/30 p-2.5 rounded-xl transition-colors backdrop-blur-md text-indigo-100"><Settings size={20} /></button>
            <button onClick={copyCode} className={`p-2.5 rounded-xl transition-all backdrop-blur-md text-indigo-100 ${copied ? 'bg-emerald-500' : 'bg-white/20 hover:bg-white/30'}`}>{copied ? <Check size={20} /> : <Share2 size={20} />}</button>
            <button onClick={() => setGroupModalOpen(true)} className="bg-white text-indigo-600 hover:bg-indigo-50 py-2 px-3 rounded-xl transition-colors shadow-lg font-bold text-sm flex items-center gap-2"><Users size={16} /> {users.length}</button>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 -mt-14 relative z-20">
        <Card className="mb-6 bg-white shadow-xl shadow-indigo-100/50 border-0">
          <div className="p-6 flex justify-between items-center">
            <div><p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Total</p><h2 className="text-3xl font-extrabold text-slate-800">{formatCurrency(totalGroupSpending)}</h2></div>
            <div className="text-right pl-4 border-l border-slate-100"><p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Per persona</p><p className="text-xl font-bold text-indigo-600">{users.length > 0 ? formatCurrency(totalGroupSpending / users.length) : formatCurrency(0)}</p></div>
          </div>
        </Card>
        <div className="flex p-1.5 bg-white rounded-2xl mb-6 shadow-sm border border-slate-200">
          {[{ id: 'expenses', label: 'Despeses' }, { id: 'balances', label: 'Balanç' }, { id: 'settle', label: 'Liquidar' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === tab.id ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>{tab.label}</button>
          ))}
        </div>
        {activeTab === 'expenses' && (
          <div className="space-y-4 animate-fade-in">
             <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center gap-2 flex-1 min-w-[150px] shadow-sm"><Search size={16} className="text-slate-400 ml-1" /><input type="text" placeholder="Buscar..." className="w-full bg-transparent outline-none text-sm font-medium text-slate-700" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
              <select className="bg-white px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 outline-none shadow-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>{CATEGORIES.map(c => (<option key={c.id} value={c.id}>{c.label}</option>))}</select>
            </div>
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200"><Receipt size={32} className="text-indigo-300 mx-auto mb-4" /><p className="text-slate-400 text-sm">No hi ha despeses.</p>{!searchQuery && filterCategory === 'all' && <Button onClick={() => setIsModalOpen(true)} className="mx-auto mt-4" icon={Plus}>Afegir Despesa</Button>}</div>
            ) : (
              <div className="space-y-3">{filteredExpenses.map((expense) => { const category = getCategory(expense.category); const isTransfer = expense.category === 'transfer'; return (
                    <Card key={expense.id} className={`hover:shadow-md transition-all group ${isTransfer ? 'bg-slate-50' : 'bg-white'}`} onClick={() => openEditModal(expense)}>
                      <div className="flex items-center p-4 cursor-pointer">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-4 shadow-sm ${category.color}`}>{isTransfer ? <ArrowRightLeft size={20}/> : <category.icon size={22} />}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start"><h4 className={`font-bold truncate ${isTransfer ? 'text-slate-600 italic' : 'text-slate-800'}`}>{expense.title}</h4><span className="text-xs text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 ml-2 whitespace-nowrap">{formatDateDisplay(expense.date)}</span></div>
                          <div className="flex items-center gap-2 mt-0.5"><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{expense.payer}</span><span className="text-xs text-slate-500">{isTransfer ? '→' : '•'} {isTransfer ? expense.involved[0] : `${expense.involved.length} pers.`}</span></div>
                        </div>
                        <div className="flex flex-col items-end pl-2">
                          <span className={`font-bold text-lg ${isTransfer ? 'text-slate-500' : 'text-slate-800'}`}>{formatCurrency(expense.amount)}</span>
                          <div className="flex items-center gap-1 mt-1 transition-opacity"><button className="text-slate-300 hover:text-red-500 p-1" onClick={(e) => deleteExpense(expense.id, e)}><Trash2 size={14} /></button></div>
                        </div>
                      </div>
                    </Card>
                  );})}</div>
            )}
          </div>
        )}
        {activeTab === 'balances' && (
           <div className="space-y-6 animate-fade-in">
             {categoryStats.length > 0 && <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-6"><DonutChart data={categoryStats} /><div className="flex-1 space-y-2">{categoryStats.slice(0, 3).map(stat => (<div key={stat.id} className="flex justify-between items-center text-sm"><span className="flex items-center gap-2 font-medium text-slate-600"><div className={`w-3 h-3 rounded-full ${stat.barColor}`}></div>{stat.label}</span><span className="font-bold text-slate-800">{Math.round(stat.percentage)}%</span></div>))}</div></div>}
             <div className="grid gap-3">{balances.map((b) => <Card key={b.user} className="p-0 overflow-hidden" onClick={() => setUserDetailModalOpen(b.user)}><div className="p-5 relative z-10"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${b.balance >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}>{(b.user || '?').charAt(0)}</div><div><p className="font-bold text-slate-800">{b.user}</p><p className={`text-xs font-bold uppercase ${b.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{b.balance >= 0 ? 'Recupera' : 'Ha de pagar'}</p></div></div><span className={`text-xl font-black ${b.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{b.balance >= 0 ? '+' : ''}{formatCurrency(b.balance)}</span></div></div></Card>)}</div>
           </div>
        )}
        {activeTab === 'settle' && (
          <div className="space-y-4 animate-fade-in">
             <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-4 text-sm text-indigo-800 flex gap-2"><Info size={20} className="shrink-0"/> Fes clic en un deute per marcar-lo com a pagat.</div>
             {settlements.length === 0 ? <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 shadow-sm"><CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={32}/><p>Tot quadrat!</p></div> : settlements.map((s, idx) => (<div key={idx} onClick={() => setSettleModalOpen(s)} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98]"><div className="flex flex-col items-center w-20"><span className="font-bold text-rose-600">{s.from}</span></div><div className="flex-1 px-2 flex flex-col items-center"><span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Paga a</span><ChevronRight size={14} className="text-slate-300 my-1"/><div className="bg-indigo-600 text-white px-3 py-1 rounded-full font-bold text-sm shadow-md">{formatCurrency(s.amount)}</div></div><div className="flex flex-col items-center w-20"><span className="font-bold text-emerald-600">{s.to}</span></div></div>))}
          </div>
        )}
      </main>
      <button onClick={() => setIsModalOpen(true)} className="fixed bottom-6 right-6 md:right-[calc(50%-350px)] bg-indigo-600 text-white p-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all z-40 shadow-indigo-200"><Plus size={28} /></button>
      
      <Modal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} title="Configuració Viatge"><div className="space-y-6"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nom</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={editTripName} onChange={e => setEditTripName(e.target.value)} /></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Data</label><input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={editTripDate} onChange={e => setEditTripDate(e.target.value)} /></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Moneda</label><div className="grid grid-cols-2 gap-2">{CURRENCIES.map(c => (<button key={c.code} onClick={() => onUpdate({ currency: c })} className={`p-3 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-2 ${currency?.code === c.code ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-slate-300'}`}><span>{c.symbol}</span> {c.code}</button>))}</div></div><Button onClick={handleUpdateSettings}>Guardar canvis</Button></div></Modal>
      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title={confirmAction?.title || 'Confirmació'}><div className="space-y-6 text-center"><div className="py-2"><p className="text-slate-600">{confirmAction?.message}</p></div>{confirmAction?.type === 'info' ? <Button onClick={() => setConfirmAction(null)} className="w-full">Entesos</Button> : <div className="flex gap-3"><Button variant="secondary" onClick={() => setConfirmAction(null)} className="flex-1">Cancel·lar</Button><Button variant="danger" onClick={executeConfirmation} className="flex-1" icon={Trash2}>Eliminar</Button></div>}</div></Modal>
      <Modal isOpen={!!settleModalOpen} onClose={() => setSettleModalOpen(null)} title="Confirmar Pagament">{settleModalOpen && <div className="space-y-6 text-center"><div className="py-4"><p className="text-slate-500 text-lg">Confirmar pagament de</p><p className="text-xl font-bold text-slate-800 my-2">{settleModalOpen.from} <ArrowRightLeft className="inline mx-2" size={16}/> {settleModalOpen.to}</p><p className="text-3xl font-black text-indigo-600">{formatCurrency(settleModalOpen.amount)}</p></div><div className="flex gap-2"><Button variant="secondary" onClick={() => setSettleModalOpen(null)} className="flex-1">Cancel·lar</Button><Button variant="success" onClick={handleSettleDebt} className="flex-1" icon={CheckCircle2}>Confirmar</Button></div></div>}</Modal>
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? "Editar Despesa" : "Nova Despesa"}><form onSubmit={handleSaveExpense} className="space-y-6"><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-400 font-light">{currency?.symbol || '€'}</span><input type="number" step="0.01" placeholder="0.00" autoFocus={!editingId} className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl text-4xl font-bold text-slate-800 text-center outline-none" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})} /></div><div className="flex gap-3"><div className="flex-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Concepte</label><input type="text" placeholder="Sopar..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={newExpense.title} onChange={(e) => setNewExpense({...newExpense, title: e.target.value})} /></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Categoria</label><select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newExpense.category} onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}>{CATEGORIES.filter(c => c.id !== 'all').map(c => (<option key={c.id} value={c.id}>{c.label}</option>))}</select></div></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Data</label><input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newExpense.date} onChange={(e) => setNewExpense({...newExpense, date: e.target.value})} /></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pagador</label><div className="flex flex-wrap gap-2">{users.map(u => (<button type="button" key={u} onClick={() => setNewExpense({...newExpense, payer: u})} className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${newExpense.payer === u ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200'}`}>{u}</button>))}</div></div>{newExpense.category !== 'transfer' && <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="flex justify-between mb-2"><label className="block text-xs font-bold text-slate-500 uppercase">Participants</label><button type="button" onClick={() => setNewExpense({...newExpense, involved: newExpense.involved.length === users.length ? [] : users})} className="text-xs font-bold text-indigo-600">{newExpense.involved.length === users.length ? 'Desmarcar' : 'Tothom'}</button></div><div className="grid grid-cols-2 gap-2">{users.map(u => { const isSelected = newExpense.involved.length === 0 || newExpense.involved.includes(u); return (<button type="button" key={u} onClick={() => { const current = newExpense.involved.length === 0 ? [...users] : newExpense.involved; const updated = current.includes(u) ? current.filter(i => i !== u) : [...current, u]; setNewExpense({...newExpense, involved: updated}); }} className={`flex items-center gap-2 p-2 rounded-lg text-sm font-medium transition-all ${isSelected ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200' : 'text-slate-400 opacity-50'}`}><div className={`w-4 h-4 rounded border ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}></div> {u}</button>) })}</div></div>}<div className="flex gap-2">{editingId && <Button variant="danger" className="w-16" icon={Trash2} onClick={() => deleteExpense(editingId, { stopPropagation: () => {} })}></Button>} <Button className="flex-1 text-lg py-4" onClick={handleSaveExpense} disabled={!newExpense.amount || !newExpense.title}>{editingId ? "Guardar" : "Afegir"}</Button></div></form></Modal>
      <Modal isOpen={groupModalOpen} onClose={() => setGroupModalOpen(false)} title="Gestionar Grup"><div className="space-y-6"><div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-4 flex justify-between items-center"><span className="font-mono text-xl font-bold tracking-widest text-indigo-900">{tripId}</span><button onClick={copyCode} className={`text-indigo-600 bg-white p-2 rounded-lg shadow-sm transition-all ${copied ? 'bg-emerald-100 text-emerald-600' : ''}`}>{copied ? <Check size={16}/> : <Copy size={16}/>}</button></div><div className="space-y-2">{users.map(u => (<div key={u} className="flex justify-between items-center bg-white border border-slate-100 p-3 rounded-xl">{editingUser?.oldName === u ? (<form onSubmit={handleRenameUser} className="flex gap-2 w-full"><input autoFocus type="text" className="flex-1 bg-slate-50 px-2 rounded border border-indigo-300 outline-none" value={editingUser.newName} onChange={e => setEditingUser({...editingUser, newName: e.target.value})} /><button type="submit" className="text-emerald-600"><CheckCircle2 size={18}/></button></form>) : (<><span className="font-bold text-slate-700">{u}</span><div className="flex gap-2"><button onClick={() => setEditingUser({ oldName: u, newName: u })} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={14}/></button><button onClick={() => handleDeleteUser(u)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button></div></>)}</div>))}</div><div className="pt-4 border-t border-slate-100 flex gap-2"><input type="text" placeholder="Nom..." className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} /><Button variant="secondary" onClick={handleAddUser} icon={Plus} disabled={!newUserName}>Afegir</Button></div></div></Modal>
      <style>{`@keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } @keyframes slide-up { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } } .animate-fade-in { animation: fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; } .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; } .scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}