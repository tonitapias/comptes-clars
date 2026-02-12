// src/hooks/useExpenseForm.ts
import { useState, useEffect } from 'react';
import { Expense, TripUser, Currency, CategoryId, SplitType, MoneyCents, toCents } from '../types';
import { SPLIT_TYPES } from '../utils/constants'; // [FIX] Importació corregida (abans billingService)

interface UseExpenseFormProps {
  initialData: Expense | null;
  users: TripUser[];
  currency: Currency;
  onSubmit: (data: Omit<Expense, 'id'>) => Promise<void>;
}

/**
 * HELPER: Converteix string monetari ("10.50") a cèntims enters (1050) de forma segura.
 * Retorna MoneyCents per satisfer la seguretat de tipus.
 */
const stringToCents = (value: string): MoneyCents => {
  // 1. Netejar entrada (només dígits, punts o comes)
  const clean = value.replace(/[^0-9.,]/g, '').replace(',', '.');
  if (!clean || clean === '.') return toCents(0);

  // 2. Separar part entera i decimal
  const [integerStr, decimalStr] = clean.split('.');
  
  const integerPart = parseInt(integerStr || '0', 10);
  // Assegurem que només agafem 2 decimals i fem padding (ex: "5" -> "50")
  const decimalPart = decimalStr 
    ? parseInt(decimalStr.slice(0, 2).padEnd(2, '0'), 10) 
    : 0;

  // 3. Retornar enter total tipat
  return toCents((integerPart * 100) + decimalPart);
};

export function useExpenseForm({ initialData, users, currency, onSubmit }: UseExpenseFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  
  // Guardem els imports com a string per evitar problemes d'UX
  const [amount, setAmount] = useState(
    initialData?.amount 
      ? (initialData.amount / 100).toFixed(2) 
      : ''
  );
  
  const [payer, setPayer] = useState(initialData?.payer || (users.find(u => !u.isDeleted)?.id || ''));
  const [category, setCategory] = useState<CategoryId>(initialData?.category || 'food');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString());
  const [receiptUrl, setReceiptUrl] = useState(initialData?.receiptUrl || '');
  
  const [splitType, setSplitType] = useState<SplitType>(initialData?.splitType || SPLIT_TYPES.EQUAL);
  const [involved, setInvolved] = useState<string[]>(initialData?.involved || users.map(u => u.id));
  
  // UX MILLORADA: Guardem els detalls com a strings per permetre edició fluida
  const [splitDetails, setSplitDetails] = useState<Record<string, string>>(() => {
    if (!initialData?.splitDetails) return {};
    const details: Record<string, string> = {};
    Object.entries(initialData.splitDetails).forEach(([uid, val]) => {
      // Convertim de cèntims a string unitari (ex: 1050 -> "10.50")
      details[uid] = (val / 100).toFixed(2);
    });
    return details;
  });

  const [isForeignCurrency, setIsForeignCurrency] = useState(!!initialData?.originalCurrency);
  const [foreignAmount, setForeignAmount] = useState(initialData?.originalAmount?.toString() || '');
  const [foreignCurrency, setForeignCurrency] = useState(initialData?.originalCurrency || 'USD');
  const [exchangeRate, setExchangeRate] = useState(initialData?.exchangeRate?.toString() || '');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- AUTOSUMA SEGURA ---
  useEffect(() => {
    if (splitType === SPLIT_TYPES.EXACT) {
      // Sumem directament els cèntims (MoneyCents en runtime és un number, així que reduce funciona)
      const totalCents = Object.values(splitDetails).reduce((sum, val) => {
        return sum + stringToCents(val); // stringToCents retorna MoneyCents (number)
      }, 0);
      
      if (totalCents > 0) {
        setAmount((totalCents / 100).toFixed(2));
      } else {
        setAmount('');
      }
    }
  }, [splitDetails, splitType]);

  const toggleInvolved = (userId: string) => {
    setInvolved(prev => {
      if (prev.includes(userId)) {
        if (prev.length === 1) return prev; 
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handleDetailChange = (userId: string, value: string) => {
    if (/^\d*[.,]?\d*$/.test(value)) {
      setSplitDetails(prev => ({
        ...prev,
        [userId]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      
      // 1. Conversió Estricta: String -> MoneyCents
      const amountInCents = stringToCents(amount);
      
      // Construïm l'objecte parcialment, tipant-lo com 'any' per muntatge
      // però assegurant que els camps crítics són correctes.
      const expenseData: any = {
        title: title.trim(),
        amount: amountInCents, // Ara és MoneyCents
        payer,
        category,
        date: new Date(date).toISOString(),
        splitType,
        involved,
      };

      if (splitType !== SPLIT_TYPES.EQUAL) {
        const detailsInCents: Record<string, MoneyCents> = {};
        Object.entries(splitDetails).forEach(([uid, val]) => {
          detailsInCents[uid] = stringToCents(val);
        });
        expenseData.splitDetails = detailsInCents;
      }

      if (receiptUrl?.trim()) {
        expenseData.receiptUrl = receiptUrl.trim();
      }

      // Aquests camps segueixen sent 'number' (floats) o string segons la interfície
      if (isForeignCurrency) {
        expenseData.originalAmount = parseFloat(foreignAmount);
        expenseData.originalCurrency = foreignCurrency;
        expenseData.exchangeRate = parseFloat(exchangeRate);
      }

      // TypeScript ara estarà content perquè expenseData compleix l'interface Expense
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