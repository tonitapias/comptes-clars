// src/hooks/useExpenseForm.ts
import { useState, useMemo } from 'react';
import { Expense, TripUser, Currency, CategoryId, SplitType, MoneyCents, toCents } from '../types';
import { SPLIT_TYPES } from '../utils/constants';

interface UseExpenseFormProps {
  initialData: Expense | null;
  users: TripUser[];
  currency: Currency;
  onSubmit: (data: Omit<Expense, 'id'>) => Promise<void>;
}

/**
 * HELPER: Conversió segura d'String a MoneyCents
 * Gestiona entrades incompletes com "10." o ".5" sense trencar l'app.
 */
const stringToCents = (value: string): MoneyCents => {
  const clean = value.replace(/[^0-9.,]/g, '').replace(',', '.');
  if (!clean || clean === '.') return toCents(0);

  const [integerStr, decimalStr] = clean.split('.');
  const integerPart = parseInt(integerStr || '0', 10);
  const decimalPart = decimalStr 
    ? parseInt(decimalStr.slice(0, 2).padEnd(2, '0'), 10) 
    : 0;

  return toCents((integerPart * 100) + decimalPart);
};

export function useExpenseForm({ initialData, users, currency, onSubmit }: UseExpenseFormProps) {
  // --- ESTAT DEL FORMULARI ---
  const [title, setTitle] = useState(initialData?.title || '');
  
  // Guardem com a string per a una edició UX fluida (evita salts de cursor)
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
  
  const [splitDetails, setSplitDetails] = useState<Record<string, string>>(() => {
    if (!initialData?.splitDetails) return {};
    const details: Record<string, string> = {};
    Object.entries(initialData.splitDetails).forEach(([uid, val]) => {
      details[uid] = (val / 100).toFixed(2);
    });
    return details;
  });

  // Camps opcionals de divisa (no crítics per a la lògica core actual)
  const [isForeignCurrency, setIsForeignCurrency] = useState(!!initialData?.originalCurrency);
  const [foreignAmount, setForeignAmount] = useState(initialData?.originalAmount?.toString() || '');
  const [foreignCurrency, setForeignCurrency] = useState(initialData?.originalCurrency || 'USD');
  const [exchangeRate, setExchangeRate] = useState(initialData?.exchangeRate?.toString() || '');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- LÒGICA DERIVADA (Validació en temps real) ---
  
  // Càlcul centralitzat de l'estat del repartiment Exacte
  const exactSplitStats = useMemo(() => {
    if (splitType !== SPLIT_TYPES.EXACT) return null;

    const totalCents = stringToCents(amount);
    const allocatedCents = Object.values(splitDetails).reduce((sum, val) => sum + stringToCents(val), 0);
    const remainderCents = totalCents - allocatedCents;

    return {
      totalCents,
      allocatedCents,
      remainderCents,
      isOverAllocated: remainderCents < 0,
      isFullyAllocated: remainderCents === 0,
      isValid: remainderCents >= 0 // Validació de negoci: no es pot repartir més del que hi ha
    };
  }, [amount, splitDetails, splitType]);


  // --- HANDLERS ---

  const toggleInvolved = (userId: string) => {
    setInvolved(prev => {
      if (prev.includes(userId)) {
        // Evitem deixar la llista buida
        if (prev.length === 1) return prev; 
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handleDetailChange = (userId: string, value: string) => {
    // Permetem només números i un punt/coma decimal
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

    // Validació prèvia a l'enviament (Client-Side Gatekeeper)
    if (splitType === SPLIT_TYPES.EXACT && exactSplitStats?.isOverAllocated) {
        // Opcional: Podríem llançar un error o fer vibrar la UI, 
        // però el botó de submit hauria d'estar deshabilitat a la UI.
        return; 
    }

    try {
      setIsSubmitting(true);
      
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
        const detailsInCents: Record<string, MoneyCents> = {};
        Object.entries(splitDetails).forEach(([uid, val]) => {
          const valCents = stringToCents(val);
          // Només enviem detalls amb valor > 0 per netejar la DB
          if (valCents > 0) {
            detailsInCents[uid] = valCents;
          }
        });
        expenseData.splitDetails = detailsInCents;
      }

      if (receiptUrl?.trim()) {
        expenseData.receiptUrl = receiptUrl.trim();
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
      isForeignCurrency, foreignAmount, foreignCurrency, exchangeRate,
      // Exposem l'estat de validació calculat
      exactSplitStats 
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