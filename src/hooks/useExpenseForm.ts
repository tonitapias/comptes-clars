import { useState, useEffect } from 'react';
import { Expense, TripUser, Currency, CurrencyCode, CategoryId, SplitType } from '../types';

interface UseExpenseFormProps {
  initialData: Expense | null;
  users: TripUser[];
  currency: Currency;
  onSubmit: (data: Omit<Expense, 'id'>) => Promise<void>;
}

export function useExpenseForm({ initialData, users, currency, onSubmit }: UseExpenseFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  
  // Convertim cèntims a unitats per a l'input (ex: 2000 -> 20.00)
  const [amount, setAmount] = useState(
    initialData?.amount 
      ? (initialData.amount / 100).toFixed(2) 
      : ''
  );
  
  const [payer, setPayer] = useState(initialData?.payer || (users.find(u => !u.isDeleted)?.id || ''));
  const [category, setCategory] = useState<CategoryId>(initialData?.category || 'food');
  const [date, setDate] = useState(initialData?.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [receiptUrl, setReceiptUrl] = useState(initialData?.receiptUrl || '');
  
  const [splitType, setSplitType] = useState<SplitType>(initialData?.splitType || 'equal');
  const [involved, setInvolved] = useState<string[]>(initialData?.involved || users.filter(u => !u.isDeleted).map(u => u.id));
  
  // Convertim els detalls del repartiment de cèntims a unitats si cal
  const [splitDetails, setSplitDetails] = useState<Record<string, number>>(() => {
    if (!initialData?.splitDetails) return {};
    const normalized: Record<string, number> = {};
    Object.entries(initialData.splitDetails).forEach(([uid, val]) => {
      normalized[uid] = val / 100; 
    });
    return normalized;
  });

  const [isForeignCurrency, setIsForeignCurrency] = useState(!!initialData?.originalCurrency);
  const [foreignAmount, setForeignAmount] = useState(initialData?.originalAmount?.toString() || '');
  const [foreignCurrency, setForeignCurrency] = useState<CurrencyCode>(initialData?.originalCurrency || 'USD');
  const [exchangeRate, setExchangeRate] = useState(initialData?.exchangeRate?.toString() || '1');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isForeignCurrency && foreignAmount && exchangeRate) {
      const calculated = parseFloat(foreignAmount) / parseFloat(exchangeRate);
      setAmount(calculated.toFixed(2));
    }
  }, [foreignAmount, exchangeRate, isForeignCurrency]);

  const handleSelectAll = () => setInvolved(users.filter(u => !u.isDeleted).map(u => u.id));
  const handleSelectNone = () => setInvolved([]);
  const handleSelectOnlyPayer = () => setInvolved([payer]);
  
  const toggleInvolved = (uid: string) => {
    setInvolved(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const handleDetailChange = (uid: string, value: string) => {
    setSplitDetails(prev => ({ ...prev, [uid]: parseFloat(value) || 0 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !payer) return;
    setIsSubmitting(true);

    try {
      // Convertim l'input (unitats) a cèntims per guardar
      const amountInCents = Math.round(parseFloat(amount) * 100);
      
      const expenseData: Omit<Expense, 'id'> = {
        title,
        amount: amountInCents,
        payer,
        category,
        date: new Date(date).toISOString(),
        involved: splitType === 'equal' ? involved : Object.keys(splitDetails).filter(k => splitDetails[k] > 0),
        splitType,
      };

      if (splitType !== 'equal') {
        // Tornem a convertir els detalls a cèntims per a la base de dades
        const detailsInCents: Record<string, number> = {};
        Object.entries(splitDetails).forEach(([uid, val]) => {
          detailsInCents[uid] = Math.round(val * 100);
        });
        expenseData.splitDetails = detailsInCents;
      }

      if (receiptUrl?.trim()) {
        expenseData.receiptUrl = receiptUrl;
      }

      if (isForeignCurrency) {
        expenseData.originalAmount = parseFloat(foreignAmount);
        expenseData.originalCurrency = foreignCurrency;
        expenseData.exchangeRate = parseFloat(exchangeRate);
      }

      await onSubmit(expenseData);

    } catch (error) {
      console.error("Error submitting expense:", error);
      throw error; 
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formState: {
      title, amount, payer, category, date, receiptUrl, 
      splitType, involved, splitDetails, 
      isForeignCurrency, foreignAmount, foreignCurrency, exchangeRate
    },
    setters: {
      setTitle, setAmount, setPayer, setCategory, setDate, setReceiptUrl,
      setSplitType, setInvolved, setSplitDetails,
      setIsForeignCurrency, setForeignAmount, setForeignCurrency, setExchangeRate
    },
    logic: {
      handleSelectAll, handleSelectNone, handleSelectOnlyPayer, 
      toggleInvolved, handleDetailChange, handleSubmit
    },
    isSubmitting
  };
}