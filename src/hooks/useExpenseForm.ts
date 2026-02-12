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

/**
 * HELPER: Converteix string monetari ("10.50") a cèntims enters (1050) de forma segura.
 * Evita l'ús de parseFloat per prevenir errors de punt flotant (IEEE 754).
 */
const stringToCents = (value: string): number => {
  // 1. Netejar entrada (només dígits, punts o comes)
  const clean = value.replace(/[^0-9.,]/g, '').replace(',', '.');
  if (!clean || clean === '.') return 0;

  // 2. Separar part entera i decimal
  const [integerStr, decimalStr] = clean.split('.');
  
  const integerPart = parseInt(integerStr || '0', 10);
  // Assegurem que només agafem 2 decimals i fem padding (ex: "5" -> "50")
  const decimalPart = decimalStr 
    ? parseInt(decimalStr.slice(0, 2).padEnd(2, '0'), 10) 
    : 0;

  // 3. Retornar enter total
  return (integerPart * 100) + decimalPart;
};

export function useExpenseForm({ initialData, users, currency, onSubmit }: UseExpenseFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  
  // Guardem els imports com a string per evitar problemes d'UX (cursors que salten, "0.00" vs "0")
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

  // --- AUTOSUMA SEGURA (RISC ZERO) ---
  useEffect(() => {
    if (splitType === SPLIT_TYPES.EXACT) {
      // Sumem directament els cèntims per evitar decimals estranys
      const totalCents = Object.values(splitDetails).reduce((sum, val) => {
        return sum + stringToCents(val);
      }, 0);
      
      // Actualitzem l'import principal només si hi ha canvis rellevants
      // Usem toFixed(2) per mostrar format moneda estàndard
      if (totalCents > 0) {
        setAmount((totalCents / 100).toFixed(2));
      } else {
        setAmount('');
      }
    }
  }, [splitDetails, splitType]);

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
    // Permetem que l'usuari escrigui lliurement (strings), validant només caràcters bàsics
    // Això permet escriure "10." sense que s'esborri el punt immediatament.
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
      
      // CONVERSIÓ SEGURA: String -> Cèntims Enters
      const amountInCents = stringToCents(amount);
      
      const expenseData: any = {
        title: title.trim(),
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
          // Convertim cada input individual a cèntims (o unitats scalades x100 per shares)
          detailsInCents[uid] = stringToCents(val);
        });
        expenseData.splitDetails = detailsInCents;
      }

      if (receiptUrl?.trim()) {
        expenseData.receiptUrl = receiptUrl.trim();
      }

      if (isForeignCurrency) {
        // Els camps originals sí que poden ser floats perquè són informatius
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