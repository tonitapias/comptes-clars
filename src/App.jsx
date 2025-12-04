import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Users, Receipt, ArrowRightLeft, Trash2, Wallet, X, 
  CheckCircle2, ChevronRight, Utensils, Car, Home, Beer, 
  Plane, ShoppingBag, Music, HelpCircle, Search, Filter, 
  Edit2, Download, Upload, PieChart as PieChartIcon, Info, Settings, DollarSign,
  Share2, LogOut, Loader2, Cloud, Banknote, Check, Copy, Calendar, Ticket
} from 'lucide-react';

// Importacions de Firebase
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, onSnapshot, setDoc, updateDoc, 
  arrayUnion, arrayRemove, getDoc, collection 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

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

// --- FIREBASE SETUP ---
// Aquest bloc detecta si estem al xat o al teu ordinador
let firebaseConfig;
let appId = 'comptes-clars-v1';

if (typeof __firebase_config !== 'undefined') {
  // CONFIGURACIÓ AUTOMÀTICA (PER AL XAT)
  firebaseConfig = JSON.parse(__firebase_config);
  appId = typeof __app_id !== 'undefined' ? __app_id : appId;
} else {
  // CONFIGURACIÓ MANUAL (PER AL TEU ORDINADOR / VERCEL)
  // ⚠️ Has d'omplir això amb les dades de la consola de Firebase quan ho baixis
  const firebaseConfig = {
  apiKey: "AIzaSyD_ExampleKey123456",
  authDomain: "el-teu-projecte.firebaseapp.com",
  projectId: "el-teu-projecte",
  storageBucket: "el-teu-projecte.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

}

// Inicialització segura
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Error inicialitzant Firebase. Revisa les claus.", e);
}

// --- COMPONENTS UI ---

const Card = ({ children, className = "", onClick }) => (
  <div onClick={onClick} className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", icon: Icon, disabled = false, loading = false }) => {
  const baseStyle = "px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200"
  };
  
  return (
    <button onClick={onClick} disabled={disabled || loading} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : (Icon && <Icon size={18} />)}
      {children}
    </button>
  );
};

// --- MODALS HELPER ---
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

// --- GRÀFIC CIRCULAR (DONUT) SVG ---
const DonutChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const size = 100;
  const strokeWidth = 15;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {data.map((item, i) => {
          const dashArray = (item.percentage / 100) * circumference;
          const currentOffset = offset;
          offset += dashArray;
          const colorMap = {
            'bg-orange-500': '#f97316', 'bg-blue-500': '#3b82f6', 'bg-indigo-500': '#6366f1',
            'bg-purple-500': '#a855f7', 'bg-sky-500': '#0ea5e9', 'bg-pink-500': '#ec4899',
            'bg-rose-500': '#f43f5e', 'bg-teal-500': '#14b8a6', 'bg-emerald-500': '#10b981', 'bg-slate-500': '#64748b', 'bg-slate-400': '#94a3b8'
          };
          return (
            <circle key={item.id} cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke={colorMap[item.barColor] || '#ccc'} strokeWidth={strokeWidth} strokeDasharray={`${dashArray} ${circumference}`} strokeDashoffset={-currentOffset} className="transition-all duration-1000 ease-out" />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><PieChartIcon className="text-slate-300" size={24} /></div>
    </div>
  );
};

// --- APP PRINCIPAL ---

export default function App() {
  const [user, setUser] = useState(null);
  const [tripId, setTripId] = useState(null);
  
  const [tripData, setTripData] = useState({ name: '', users: [], expenses: [], currency: CURRENCIES[0], createdAt: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      // Si estem en entorn local i no hi ha API Key, no fem res
      if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("POSA_AQUI")) {
        setLoading(false);
        return;
      }

      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    if(auth) {
        const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
        return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    const savedTripId = window.localStorage.getItem('cc-last-trip-id');
    if (savedTripId) setTripId(savedTripId);
  }, []);

  useEffect(() => {
    if (!user || !tripId || !db) { setLoading(false); return; }
    setLoading(true);
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTripData({
          name: data.name || 'Viatge Sense Nom',
          users: data.users || [],
          expenses: data.expenses || [],
          currency: data.currency || CURRENCIES[0],
          createdAt: data.createdAt || null
        });
        setLoading(false);
      } else {
        setError("Aquest viatge no existeix o ha estat eliminat.");
        setTripId(null);
        window.localStorage.removeItem('cc-last-trip-id');
        setLoading(false);
      }
    }, (err) => { console.error("Error:", err); if (err.code !== 'permission-denied') setError("Error de connexió."); setLoading(false); });
    return () => unsubscribe();
  }, [user, tripId]);

  const createTrip = async (tripName, creatorName) => {
    if (!user || !db) return;
    const newId = Math.random().toString(36).substring(2, 9);
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${newId}`);
    await setDoc(docRef, { id: newId, name: tripName, users: [creatorName], expenses: [], currency: CURRENCIES[0], createdAt: new Date().toISOString() });
    window.localStorage.setItem('cc-last-trip-id', newId);
    setTripId(newId);
  };

  const joinTrip = (code) => {
    if (code.length < 3) return;
    window.localStorage.setItem('cc-last-trip-id', code);
    setTripId(code);
    setError(null);
  };

  const updateTripData = async (newData) => {
    if (!user || !tripId || !db) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`);
    await updateDoc(docRef, newData);
  };

  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("POSA_AQUI")) {
    return <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center text-slate-600">
      <div className="bg-red-100 text-red-600 p-4 rounded-xl mb-4"><Info size={32} className="mx-auto mb-2"/>Falten les claus de Firebase!</div>
      <p>Aquest error surt perquè estàs executant l'app en local i no has posat la teva configuració.</p>
      <p className="mt-2 text-sm">Edita el fitxer <code>App.jsx</code> i posa les teves dades a la variable <code>firebaseConfig</code>.</p>
    </div>;
  }

  if (!tripId) return <LandingScreen onCreate={createTrip} onJoin={joinTrip} error={error} loading={loading && user} />;

  return (
    <MainApp 
      tripData={tripData} 
      tripId={tripId} 
      onUpdate={updateTripData} 
      onExit={() => { setTripId(null); window.localStorage.removeItem('cc-last-trip-id'); setTripData({ name: '', users: [], expenses: [], currency: CURRENCIES[0], createdAt: null }); }}
      loadingData={loading}
    />
  );
}

// --- LANDING SCREEN ---
function LandingScreen({ onCreate, onJoin, error, loading }) {
  const [mode, setMode] = useState('menu');
  const [inputName, setInputName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [inputCode, setInputCode] = useState('');

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-indigo-600"><Loader2 size={48} className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-b-[50%] scale-150 -translate-y-1/2"></div>
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <div className="bg-white/20 backdrop-blur-md w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-white/30">
            <Cloud className="text-white" size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-800 mb-2">Comptes Clars</h1>
          <p className="text-slate-500 font-medium">Gestiona les despeses en grup.</p>
        </div>
        <Card className="p-8 shadow-xl border-0">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 flex items-center gap-2"><Info size={16}/> {error}</div>}
          {mode === 'menu' && (
            <div className="space-y-4">
              <Button onClick={() => setMode('create')} className="w-full py-4 text-lg">Crear nou viatge</Button>
              <Button variant="secondary" onClick={() => setMode('join')} className="w-full py-4 text-lg">Tinc un codi</Button>
            </div>
          )}
          {mode === 'create' && (
            <div className="space-y-4 animate-fade-in">
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Nom del viatge</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={inputName} onChange={e => setInputName(e.target.value)}/></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">El teu nom</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={creatorName} onChange={e => setCreatorName(e.target.value)}/></div>
              <div className="flex gap-2 pt-2"><Button variant="ghost" onClick={() => setMode('menu')}>Enrere</Button><Button className="flex-1" disabled={!inputName || !creatorName} onClick={() => onCreate(inputName, creatorName)}>Començar</Button></div>
            </div>
          )}
          {mode === 'join' && (
            <div className="space-y-4 animate-fade-in">
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Codi del viatge</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-center text-lg uppercase" value={inputCode} onChange={e => setInputCode(e.target.value)}/></div>
              <div className="flex gap-2 pt-2"><Button variant="ghost" onClick={() => setMode('menu')}>Enrere</Button><Button className="flex-1" disabled={inputCode.length < 3} onClick={() => onJoin(inputCode)}>Entrar</Button></div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// --- APP PRINCIPAL ---

function MainApp({ tripData, tripId, onUpdate, onExit, loadingData }) {
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

  // --- HELPERS ---
  const formatCurrency = (amount) => new Intl.NumberFormat(currency?.locale || 'ca-ES', { style: 'currency', currency: currency?.code || 'EUR' }).format(amount);
  const getCategory = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[9];
  
  const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' });
  };
  
  const copyCode = () => {
    const textArea = document.createElement("textarea");
    textArea.value = tripId;
    textArea.style.position = "fixed"; textArea.style.top = "0"; textArea.style.left = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error('No s\'ha pogut copiar', err); }
    document.body.removeChild(textArea);
  };

  const openSettings = () => {
    setEditTripName(name);
    setEditTripDate(createdAt ? new Date(createdAt).toISOString().split('T')[0] : '');
    setSettingsModalOpen(true);
  };

  // --- LOGIC ---
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(e => {
        const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.payer.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === 'all' || e.category === filterCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);
  }, [expenses, searchQuery, filterCategory]);

  const balances = useMemo(() => {
    const balanceMap = {};
    users.forEach(u => balanceMap[u] = 0);
    expenses.forEach(exp => {
      if (exp.category === 'transfer') {
         if (balanceMap[exp.payer] !== undefined) balanceMap[exp.payer] += exp.amount;
         exp.involved.forEach(p => { if (balanceMap[p] !== undefined) balanceMap[p] -= exp.amount; });
      } else {
         if (balanceMap[exp.payer] !== undefined) balanceMap[exp.payer] += exp.amount;
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
      if (!stats[exp.category]) stats[exp.category] = 0;
      stats[exp.category] += exp.amount;
    });
    return Object.entries(stats).map(([id, amount]) => ({
      id, amount, ...CATEGORIES.find(c => c.id === id), percentage: (amount / total) * 100
    })).sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const settlements = useMemo(() => {
    let debts = [];
    let debtors = balances.filter(b => b.balance < -0.01).map(b => ({ ...b }));
    let creditors = balances.filter(b => b.balance > 0.01).map(b => ({ ...b }));
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      let debtor = debtors[i];
      let creditor = creditors[j];
      let amount = Math.min(Math.abs(debtor.balance), creditor.balance);
      debts.push({ from: debtor.user, to: creditor.user, amount });
      debtor.balance += amount;
      creditor.balance -= amount;
      if (Math.abs(debtor.balance) < 0.01) i++;
      if (creditor.balance < 0.01) j++;
    }
    return debts;
  }, [balances]);

  const totalGroupSpending = expenses.filter(e => e.category !== 'transfer').reduce((acc, curr) => acc + curr.amount, 0);

  // --- ACTIONS ---
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount) return;
    
    let finalDate;
    if (newExpense.date) {
        const d = new Date(newExpense.date);
        d.setHours(12, 0, 0, 0); 
        finalDate = d.toISOString();
    } else {
        finalDate = new Date().toISOString();
    }

    const expenseData = {
      id: editingId || Date.now(),
      title: newExpense.title,
      amount: parseFloat(newExpense.amount),
      payer: newExpense.payer || users[0],
      category: newExpense.category,
      involved: newExpense.involved.length > 0 ? newExpense.involved : users,
      date: finalDate 
    };
    const newExpensesList = editingId ? expenses.map(exp => exp.id === editingId ? expenseData : exp) : [expenseData, ...expenses];
    await onUpdate({ expenses: newExpensesList });
    closeModal();
  };

  const deleteExpense = (id, e) => {
    e.stopPropagation();
    setConfirmAction({
      type: 'delete_expense',
      id: id,
      title: 'Eliminar Despesa',
      message: 'Estàs segur que vols eliminar aquesta despesa permanentment?'
    });
  };

  const executeConfirmation = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'delete_expense') {
      const newExpensesList = expenses.filter(exp => exp.id !== confirmAction.id);
      await onUpdate({ expenses: newExpensesList });
    } else if (confirmAction.type === 'delete_user') {
      const newUsersList = users.filter(u => u !== confirmAction.id);
      await onUpdate({ users: newUsersList });
    }
    setConfirmAction(null);
  };

  const handleSettleDebt = async () => {
    if (!settleModalOpen) return;
    const { from, to, amount } = settleModalOpen;
    const repayment = {
      id: Date.now(),
      title: `Pagament deute`,
      amount: amount,
      payer: from, 
      category: 'transfer',
      involved: [to], 
      date: new Date().toISOString()
    };
    await onUpdate({ expenses: [repayment, ...expenses] });
    setSettleModalOpen(null);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (newUserName && !users.includes(newUserName)) { await onUpdate({ users: [...users, newUserName] }); setNewUserName(''); }
  };

  const handleDeleteUser = (userName) => {
    const hasExpenses = expenses.some(e => e.payer === userName || e.involved.includes(userName));
    if (hasExpenses) { 
      setConfirmAction({ type: 'info', title: 'Acció no permesa', message: "No pots eliminar aquest usuari perquè té despeses o deutes assignats. Primer elimina'ls o edita'ls." });
      return; 
    }
    setConfirmAction({ type: 'delete_user', id: userName, title: 'Eliminar Participant', message: `Segur que vols eliminar a ${userName} del grup?` });
  };

  const handleRenameUser = async (e) => {
    e.preventDefault();
    if (!editingUser?.newName || users.includes(editingUser.newName)) return;
    const { oldName, newName } = editingUser;
    const newUsers = users.map(u => u === oldName ? newName : u);
    const newExpenses = expenses.map(exp => ({
      ...exp,
      payer: exp.payer === oldName ? newName : exp.payer,
      involved: exp.involved.map(inv => inv === oldName ? newName : inv)
    }));
    await onUpdate({ users: newUsers, expenses: newExpenses });
    setEditingUser(null);
  };

  const handleUpdateSettings = async () => {
    let newDateISO = createdAt;
    if (editTripDate) {
        const d = new Date(editTripDate);
        d.setHours(12, 0, 0, 0);
        newDateISO = d.toISOString();
    }
    await onUpdate({ name: editTripName, currency: currency, createdAt: newDateISO });
    setSettingsModalOpen(false);
  };

  const closeModal = () => { 
      setIsModalOpen(false); 
      setEditingId(null); 
      setNewExpense({ title: '', amount: '', payer: users[0], category: 'food', involved: [], date: '' }); 
  };
  
  const openEditModal = (expense) => { 
      const dateForInput = expense.date ? new Date(expense.date).toISOString().split('T')[0] : '';
      setNewExpense({ ...expense, date: dateForInput }); 
      setEditingId(expense.id); 
      setIsModalOpen(true); 
  };

  if (loadingData) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600"/></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 md:pb-10">
      
      {/* Toast Notification */}
      {copied && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg z-[60] flex items-center gap-2 animate-fade-in font-bold">
          <CheckCircle2 size={18} /> Codi copiat al porta-retalls!
        </div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-br from-indigo-800 to-indigo-600 text-white pt-8 pb-20 px-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl"></div>
        <div className="max-w-3xl mx-auto flex justify-between items-start relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors" onClick={onExit} title="Sortir">
                <LogOut className="text-indigo-100" size={16} />
              </button>
              <span className="text-indigo-200 text-xs font-bold tracking-wider uppercase">En línia • {tripId}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight truncate max-w-[200px] sm:max-w-md cursor-pointer hover:opacity-90" onClick={openSettings}>
              {name} <Edit2 size={16} className="inline opacity-50"/>
            </h1>
            {createdAt && (
              <p className="text-indigo-200 text-xs mt-1 flex items-center gap-1 opacity-80 cursor-pointer hover:underline" onClick={openSettings}>
                <Calendar size={12} /> {new Date(createdAt).toLocaleDateString('ca-ES', { dateStyle: 'long' })}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={openSettings} className="bg-white/20 hover:bg-white/30 p-2.5 rounded-xl transition-colors backdrop-blur-md text-indigo-100" title="Configuració">
              <Settings size={20} />
            </button>
            <button 
              onClick={copyCode} 
              className={`p-2.5 rounded-xl transition-all backdrop-blur-md text-indigo-100 ${copied ? 'bg-emerald-500 text-white' : 'bg-white/20 hover:bg-white/30'}`}
              title="Compartir"
            >
              {copied ? <Check size={20} /> : <Share2 size={20} />}
            </button>
            <button onClick={() => setGroupModalOpen(true)} className="bg-white text-indigo-600 hover:bg-indigo-50 py-2 px-3 rounded-xl transition-colors shadow-lg font-bold text-sm flex items-center gap-2">
              <Users size={16} /> {users.length}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 -mt-14 relative z-20">
        <Card className="mb-6 bg-white shadow-xl shadow-indigo-100/50 border-0">
          <div className="p-6 flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Total Despeses</p>
              <h2 className="text-3xl font-extrabold text-slate-800">{formatCurrency(totalGroupSpending)}</h2>
            </div>
            <div className="text-right pl-4 border-l border-slate-100">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Per persona</p>
              <p className="text-xl font-bold text-indigo-600">
                {users.length > 0 ? formatCurrency(totalGroupSpending / users.length) : formatCurrency(0)}
              </p>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex p-1.5 bg-white rounded-2xl mb-6 shadow-sm border border-slate-200">
          {[{ id: 'expenses', label: 'Despeses' }, { id: 'balances', label: 'Balanç' }, { id: 'settle', label: 'Liquidar' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === tab.id ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>{tab.label}</button>
          ))}
        </div>

        {/* --- DESPESES --- */}
        {activeTab === 'expenses' && (
          <div className="space-y-4 animate-fade-in">
             <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center gap-2 flex-1 min-w-[150px] shadow-sm">
                <Search size={16} className="text-slate-400 ml-1" />
                <input type="text" placeholder="Buscar..." className="w-full bg-transparent outline-none text-sm font-medium text-slate-700" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <select className="bg-white px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 outline-none shadow-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                {CATEGORIES.map(c => (<option key={c.id} value={c.id}>{c.label}</option>))}
              </select>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                <Receipt size={32} className="text-indigo-300 mx-auto mb-4" />
                <p className="text-slate-400 text-sm">No hi ha despeses.</p>
                {!searchQuery && filterCategory === 'all' && <Button onClick={() => setIsModalOpen(true)} className="mx-auto mt-4" icon={Plus}>Afegir Despesa</Button>}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExpenses.map((expense) => {
                  const category = getCategory(expense.category);
                  const isTransfer = expense.category === 'transfer';
                  return (
                    <Card key={expense.id} className={`hover:shadow-md transition-all group ${isTransfer ? 'bg-slate-50' : 'bg-white'}`} onClick={() => openEditModal(expense)}>
                      <div className="flex items-center p-4 cursor-pointer">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-4 shadow-sm ${category.color}`}>
                           {isTransfer ? <ArrowRightLeft size={20}/> : <category.icon size={22} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                             <h4 className={`font-bold truncate ${isTransfer ? 'text-slate-600 italic' : 'text-slate-800'}`}>{expense.title}</h4>
                             {/* Display Date on Card */}
                             <span className="text-xs text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 ml-2 whitespace-nowrap">
                               {formatDateDisplay(expense.date)}
                             </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{expense.payer}</span>
                            <span className="text-xs text-slate-500">{isTransfer ? '→' : '•'} {isTransfer ? expense.involved[0] : `${expense.involved.length} pers.`}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end pl-2">
                          <span className={`font-bold text-lg ${isTransfer ? 'text-slate-500' : 'text-slate-800'}`}>{formatCurrency(expense.amount)}</span>
                          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="text-slate-300 hover:text-red-500 p-1" onClick={(e) => deleteExpense(expense.id, e)}><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- BALANÇ --- */}
        {activeTab === 'balances' && (
           <div className="space-y-6 animate-fade-in">
             {/* Stats Chart */}
             {categoryStats.length > 0 && (
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-6">
                 <DonutChart data={categoryStats} />
                 <div className="flex-1 space-y-2">
                   {categoryStats.slice(0, 3).map(stat => (
                      <div key={stat.id} className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-2 font-medium text-slate-600">
                          <div className={`w-3 h-3 rounded-full ${stat.barColor}`}></div>
                          {stat.label}
                        </span>
                        <span className="font-bold text-slate-800">{Math.round(stat.percentage)}%</span>
                      </div>
                   ))}
                   {categoryStats.length > 3 && <p className="text-xs text-slate-400 mt-2">+ {categoryStats.length - 3} categories més</p>}
                 </div>
               </div>
             )}

             <div className="grid gap-3">
               {balances.map((b) => {
                 const isPositive = b.balance >= 0;
                 return (
                  <Card key={b.user} className="p-0 overflow-hidden" onClick={() => setUserDetailModalOpen(b.user)}>
                    <div className="p-5 relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}>{b.user.charAt(0)}</div>
                          <div>
                            <p className="font-bold text-slate-800">{b.user}</p>
                            <p className={`text-xs font-bold uppercase ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>{isPositive ? 'Recupera' : 'Ha de pagar'}</p>
                          </div>
                        </div>
                        <span className={`text-xl font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>{isPositive ? '+' : ''}{formatCurrency(b.balance)}</span>
                      </div>
                    </div>
                  </Card>
                 );
               })}
             </div>
           </div>
        )}

        {/* --- LIQUIDAR --- */}
        {activeTab === 'settle' && (
          <div className="space-y-4 animate-fade-in">
             <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-4 text-sm text-indigo-800 flex gap-2">
               <Info size={20} className="shrink-0"/> Fes clic en un deute per marcar-lo com a pagat.
             </div>
             {settlements.length === 0 ? (
               <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 shadow-sm"><CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={32}/><p>Tot quadrat!</p></div>
             ) : (
               settlements.map((s, idx) => (
                 <div key={idx} 
                   onClick={() => setSettleModalOpen(s)}
                   className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98]">
                    <div className="flex flex-col items-center w-20"><span className="font-bold text-rose-600">{s.from}</span></div>
                    <div className="flex-1 px-2 flex flex-col items-center">
                      <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Paga a</span>
                      <ChevronRight size={14} className="text-slate-300 my-1"/>
                      <div className="bg-indigo-600 text-white px-3 py-1 rounded-full font-bold text-sm shadow-md">{formatCurrency(s.amount)}</div>
                    </div>
                    <div className="flex flex-col items-center w-20"><span className="font-bold text-emerald-600">{s.to}</span></div>
                 </div>
               ))
             )}
          </div>
        )}
      </main>

      {/* FAB */}
      <button onClick={() => setIsModalOpen(true)} className="fixed bottom-6 right-6 md:right-[calc(50%-350px)] bg-indigo-600 text-white p-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all z-40 shadow-indigo-200">
        <Plus size={28} />
      </button>

      {/* --- MODALS --- */}

      {/* Settings Modal */}
      <Modal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} title="Configuració Viatge">
        <div className="space-y-6">
           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nom del Viatge</label>
              <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={editTripName} onChange={e => setEditTripName(e.target.value)} />
           </div>
           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Data del Viatge</label>
              <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={editTripDate} onChange={e => setEditTripDate(e.target.value)} />
           </div>
           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Moneda</label>
              <div className="grid grid-cols-2 gap-2">
                 {CURRENCIES.map(c => (
                   <button key={c.code} onClick={() => onUpdate({ currency: c })}
                     className={`p-3 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-2 ${currency?.code === c.code ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-slate-300'}`}>
                     <span>{c.symbol}</span> {c.code}
                   </button>
                 ))}
              </div>
           </div>
           <Button onClick={handleUpdateSettings}>Guardar canvis</Button>
        </div>
      </Modal>

      {/* Generic Confirmation Modal (NOU) */}
      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title={confirmAction?.title || 'Confirmació'}>
         <div className="space-y-6 text-center">
           <div className="py-2">
             <p className="text-slate-600">{confirmAction?.message}</p>
           </div>
           
           {confirmAction?.type === 'info' ? (
             <Button onClick={() => setConfirmAction(null)} className="w-full">Entesos</Button>
           ) : (
             <div className="flex gap-3">
               <Button variant="secondary" onClick={() => setConfirmAction(null)} className="flex-1">Cancel·lar</Button>
               <Button variant="danger" onClick={executeConfirmation} className="flex-1" icon={Trash2}>Eliminar</Button>
             </div>
           )}
         </div>
      </Modal>

      {/* Settle Confirm Modal */}
      <Modal isOpen={!!settleModalOpen} onClose={() => setSettleModalOpen(null)} title="Confirmar Pagament">
         {settleModalOpen && (
           <div className="space-y-6 text-center">
             <div className="py-4">
               <p className="text-slate-500 text-lg">Estàs a punt de marcar que</p>
               <p className="text-xl font-bold text-slate-800 my-2">{settleModalOpen.from} ha pagat {formatCurrency(settleModalOpen.amount)}</p>
               <p className="text-slate-500 text-lg">a <span className="font-bold text-slate-800">{settleModalOpen.to}</span></p>
             </div>
             <div className="flex gap-2">
               <Button variant="secondary" onClick={() => setSettleModalOpen(null)} className="flex-1">Cancel·lar</Button>
               <Button variant="success" onClick={handleSettleDebt} className="flex-1" icon={CheckCircle2}>Confirmar Pagament</Button>
             </div>
           </div>
         )}
      </Modal>

      {/* Expense Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? "Editar Despesa" : "Nova Despesa"}>
        <form onSubmit={handleSaveExpense} className="space-y-6">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-400 font-light">{currency?.symbol || '€'}</span>
            <input type="number" step="0.01" placeholder="0.00" autoFocus={!editingId} className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl text-4xl font-bold text-slate-800 text-center outline-none"
              value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})} />
          </div>
          <div className="flex gap-3">
             <div className="flex-1">
               <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Concepte</label>
               <input type="text" placeholder="Sopar..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                 value={newExpense.title} onChange={(e) => setNewExpense({...newExpense, title: e.target.value})} />
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Categoria</label>
                <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newExpense.category} onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}>
                   {CATEGORIES.filter(c => c.id !== 'all').map(c => (<option key={c.id} value={c.id}>{c.label}</option>))}
                </select>
             </div>
          </div>
          <div className="mb-4">
             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Data</label>
             <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newExpense.date} onChange={(e) => setNewExpense({...newExpense, date: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pagador</label>
            <div className="flex flex-wrap gap-2">
              {users.map(u => (
                <button type="button" key={u} onClick={() => setNewExpense({...newExpense, payer: u})}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${newExpense.payer === u ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200'}`}>{u}</button>
              ))}
            </div>
          </div>
          {newExpense.category !== 'transfer' && (
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <div className="flex justify-between mb-2">
                 <label className="block text-xs font-bold text-slate-500 uppercase">Participants</label>
                 <button type="button" onClick={() => setNewExpense({...newExpense, involved: newExpense.involved.length === users.length ? [] : users})} className="text-xs font-bold text-indigo-600">
                   {newExpense.involved.length === users.length ? 'Desmarcar' : 'Tothom'}
                 </button>
               </div>
               <div className="grid grid-cols-2 gap-2">
                 {users.map(u => {
                   const isSelected = newExpense.involved.length === 0 || newExpense.involved.includes(u);
                   return (
                     <button type="button" key={u} 
                       onClick={() => {
                         const current = newExpense.involved.length === 0 ? [...users] : newExpense.involved;
                         const updated = current.includes(u) ? current.filter(i => i !== u) : [...current, u];
                         setNewExpense({...newExpense, involved: updated});
                       }}
                       className={`flex items-center gap-2 p-2 rounded-lg text-sm font-medium transition-all ${isSelected ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200' : 'text-slate-400 opacity-50'}`}>
                       <div className={`w-4 h-4 rounded border ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}></div> {u}
                     </button>
                   )
                 })}
               </div>
             </div>
          )}
          <Button className="w-full text-lg py-4" onClick={handleSaveExpense} disabled={!newExpense.amount || !newExpense.title}>{editingId ? "Guardar" : "Afegir"}</Button>
        </form>
      </Modal>

      {/* Group Modal (Simplificat) */}
      <Modal isOpen={groupModalOpen} onClose={() => setGroupModalOpen(false)} title="Gestionar Grup">
        <div className="space-y-6">
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-4 flex justify-between items-center">
             <span className="font-mono text-xl font-bold tracking-widest text-indigo-900">{tripId}</span>
             <button onClick={copyCode} className={`text-indigo-600 bg-white p-2 rounded-lg shadow-sm transition-all ${copied ? 'bg-emerald-100 text-emerald-600' : ''}`}>
               {copied ? <Check size={16}/> : <Copy size={16}/>}
             </button>
          </div>
          <div className="space-y-2">
               {users.map(u => (
                 <div key={u} className="flex justify-between items-center bg-white border border-slate-100 p-3 rounded-xl">
                   {editingUser?.oldName === u ? (
                     <form onSubmit={handleRenameUser} className="flex gap-2 w-full">
                       <input autoFocus type="text" className="flex-1 bg-slate-50 px-2 rounded border border-indigo-300 outline-none" value={editingUser.newName} onChange={e => setEditingUser({...editingUser, newName: e.target.value})} />
                       <button type="submit" className="text-emerald-600"><CheckCircle2 size={18}/></button>
                     </form>
                   ) : (
                     <>
                      <span className="font-bold text-slate-700">{u}</span>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingUser({ oldName: u, newName: u })} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={14}/></button>
                        <button onClick={() => handleDeleteUser(u)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                      </div>
                     </>
                   )}
                 </div>
               ))}
          </div>
          <div className="pt-4 border-t border-slate-100 flex gap-2">
              <input type="text" placeholder="Nom..." className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
              <Button variant="secondary" onClick={handleAddUser} icon={Plus} disabled={!newUserName}>Afegir</Button>
          </div>
        </div>
      </Modal>

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-up { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}