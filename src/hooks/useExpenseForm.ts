import { useState, useEffect } from 'react';
import { Expense, TripUser, Currency, SplitType, CurrencyCode } from '../types';
import { CATEGORIES } from '../utils/constants';

interface UseExpenseFormProps {
  initialData: Expense | null;
  users: TripUser[];
  currency: Currency;
  onSubmit: (data: any) => Promise<void>;
}

export function useExpenseForm({ initialData, users, currency, onSubmit }: UseExpenseFormProps) {
  // Estats bàsics
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptUrl, setReceiptUrl] = useState('');

  // Estats avançats (Split & Multi-currency)
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [involved, setInvolved] = useState<string[]>([]);
  const [splitDetails, setSplitDetails] = useState<Record<string, number>>({});
  
  const [isForeignCurrency, setIsForeignCurrency] = useState(false);
  const [foreignAmount, setForeignAmount] = useState('');
  const [foreignCurrency, setForeignCurrency] = useState<CurrencyCode>('USD');
  const [exchangeRate, setExchangeRate] = useState('1.00');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Inicialització (Reset o Càrrega)
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setAmount((initialData.amount / 100).toFixed(2));
      setPayer(initialData.payer);
      setCategory(initialData.category);
      setDate(initialData.date.split('T')[0]);
      setSplitType(initialData.splitType || 'equal');
      setInvolved(initialData.involved || []);
      setReceiptUrl(initialData.receiptUrl || '');

      // Multi-divisa
      if (initialData.originalCurrency && initialData.originalCurrency !== currency.code) {
        setIsForeignCurrency(true);
        setForeignAmount(initialData.originalAmount?.toString() || '');
        setForeignCurrency(initialData.originalCurrency);
        setExchangeRate(initialData.exchangeRate?.toString() || '1.00');
      } else {
        resetForeignState();
      }

      // Detalls del repartiment
      const details = initialData.splitDetails || {};
      if (initialData.splitType === 'exact') {
        const unitsDetails: Record<string, number> = {};
        Object.entries(details).forEach(([uid, val]) => unitsDetails[uid] = val / 100);
        setSplitDetails(unitsDetails);
      } else {
        setSplitDetails(details);
      }
    } else {
      resetForm();
    }
  }, [initialData, users, currency.code]);

  const resetForeignState = () => {
    setIsForeignCurrency(false);
    setForeignAmount('');
    setForeignCurrency(currency.code === 'USD' ? 'EUR' : 'USD');
    setExchangeRate('1.00');
  };

  const resetForm = () => {
    setTitle('');
    setAmount('');
    const firstValidUser = users.find(u => !u.isDeleted);
    setPayer(firstValidUser ? firstValidUser.id : '');
    setCategory('food');
    setInvolved(users.filter(u => !u.isDeleted).map(u => u.id));
    setDate(new Date().toISOString().split('T')[0]);
    setSplitType('equal');
    setSplitDetails({});
    setReceiptUrl('');
    resetForeignState();
  };

  // 2. Càlcul Automàtic de Divisa
  useEffect(() => {
    if (isForeignCurrency) {
      const fAmount = parseFloat(foreignAmount) || 0;
      const rate = parseFloat(exchangeRate) || 0;
      if (fAmount > 0 && rate > 0) {
        setAmount((fAmount * rate).toFixed(2));
      }
    }
  }, [foreignAmount, exchangeRate, isForeignCurrency]);

  // 3. Gestió de Repartiment
  const toggleInvolved = (userId: string) => {
    setInvolved(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleDetailChange = (userId: string, value: string) => {
    const numVal = value === '' ? 0 : parseFloat(value);
    const newDetails = { ...splitDetails, [userId]: isNaN(numVal) ? 0 : numVal };
    setSplitDetails(newDetails);

    if (splitType === 'exact') {
      const newTotal = Object.values(newDetails).reduce((a, b) => a + b, 0);
      setAmount(newTotal.toFixed(2));
    }
  };

  const handleSelectAll = () => setInvolved(users.filter(u => !u.isDeleted).map(u => u.id));
  const handleSelectNone = () => setInvolved([]);
  const handleSelectOnlyPayer = () => { if (payer) setInvolved([payer]); };

  // 4. Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !payer) return;

    // Validacions de lògica
    if (splitType === 'equal' && involved.length === 0) throw new Error("Selecciona almenys una persona");
    
    let finalInvolved = involved;
    if (splitType !== 'equal') {
      finalInvolved = Object.entries(splitDetails).filter(([_, val]) => val > 0).map(([id]) => id);
      if (finalInvolved.length === 0) throw new Error("Assigna imports o parts a algú");
    }

    // Preparar dades
    const amountNum = parseFloat(amount) || 0;
    const finalAmountCents = Math.round(amountNum * 100);
    
    let finalDetails = splitDetails;
    if (splitType === 'exact') {
      finalDetails = {};
      Object.entries(splitDetails).forEach(([uid, val]) => finalDetails[uid] = Math.round(val * 100));
    } else if (splitType === 'equal') {
      finalDetails = {};
    }

    const expenseData: any = {
      title: title.trim(),
      amount: finalAmountCents,
      payer,
      category,
      involved: finalInvolved,
      date: new Date(date).toISOString(),
      splitType,
      splitDetails: finalDetails,
      receiptUrl: receiptUrl.trim() || null
    };

    if (isForeignCurrency) {
      expenseData.originalAmount = parseFloat(foreignAmount);
      expenseData.originalCurrency = foreignCurrency;
      expenseData.exchangeRate = parseFloat(exchangeRate);
    }

    setIsSubmitting(true);
    try {
      await onSubmit(expenseData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formState: { title, amount, payer, category, date, receiptUrl, splitType, involved, splitDetails, isForeignCurrency, foreignAmount, foreignCurrency, exchangeRate },
    setters: { setTitle, setAmount, setPayer, setCategory, setDate, setReceiptUrl, setSplitType, setIsForeignCurrency, setForeignAmount, setForeignCurrency, setExchangeRate },
    logic: { toggleInvolved, handleDetailChange, handleSelectAll, handleSelectNone, handleSelectOnlyPayer, handleSubmit },
    isSubmitting
  };
}