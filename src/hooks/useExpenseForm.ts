// src/hooks/useExpenseForm.ts
import { useState, useEffect } from 'react';
import { Expense, TripUser, Currency, CategoryId, SplitType } from '../types';
import { SPLIT_TYPES } from '../services/billingService';

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
  
  const [splitType, setSplitType] = useState<SplitType>(initialData?.splitType || SPLIT_TYPES.EQUAL);
  const [involved, setInvolved] = useState<string[]>(initialData?.involved || users.map(u => u.id));
  
  // Normalitzem els detalls si venen de la DB (cèntims -> unitats)
  const [splitDetails, setSplitDetails] = useState<Record<string, number>>(() => {
    if (!initialData?.splitDetails) return {};
    const details: Record<string, number> = {};
    Object.entries(initialData.splitDetails).forEach(([uid, val]) => {
      details[uid] = val / 100;
    });
    return details;
  });

  const [isForeignCurrency, setIsForeignCurrency] = useState(!!initialData?.originalCurrency);
  const [foreignAmount, setForeignAmount] = useState(initialData?.originalAmount?.toString() || '');
  const [foreignCurrency, setForeignCurrency] = useState(initialData?.originalCurrency || 'USD');
  const [exchangeRate, setExchangeRate] = useState(initialData?.exchangeRate?.toString() || '');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- NOVA FUNCIÓ: AUTOSUMA (RISC ZERO) ---
  // Aquest efecte només s'activa quan canvien els detalls i estem en mode 'exact'
  useEffect(() => {
    if (splitType === SPLIT_TYPES.EXACT) {
      // Sumem tots els valors introduïts als inputs individuals
      const total = Object.values(splitDetails).reduce((sum, val) => sum + (Number(val) || 0), 0);
      
      // Actualitzem el camp 'amount' principal
      // Usem toFixed(2) perquè sembli una moneda, o string buit si és 0 per no molestar
      setAmount(total > 0 ? total.toFixed(2) : '');
    }
  }, [splitDetails, splitType]);
  // ------------------------------------------

  // Logic handlers
  const toggleInvolved = (userId: string) => {
    setInvolved(prev => {
      if (prev.includes(userId)) {
        if (prev.length === 1) return prev; // No pot quedar buit
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handleDetailChange = (userId: string, value: string) => {
    const numValue = parseFloat(value);
    setSplitDetails(prev => ({
      ...prev,
      [userId]: isNaN(numValue) ? 0 : numValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const amountInCents = Math.round(parseFloat(amount) * 100);
      
      const expenseData: any = {
        title,
        amount: amountInCents,
        payer,
        category,
        date: new Date(date).toISOString(),
        splitType,
        involved,
      };

      if (splitType !== SPLIT_TYPES.EQUAL) {
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
      toggleInvolved,
      handleDetailChange,
      handleSubmit
    },
    isSubmitting
  };
}