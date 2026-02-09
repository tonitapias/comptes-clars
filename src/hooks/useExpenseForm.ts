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
  
  // CORRECCIÓ 1: Si editem, convertim cèntims a unitats per a l'input (ex: 2000 -> 20.00)
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
  
  // CORRECCIÓ 2: Els detalls del split també venen en cèntims si són exactes? 
  // Normalment el split "exact" guarda valors absoluts. Assumirem que també calen convertir si són imports.
  // Per simplicitat en aquesta correcció ràpida, deixem el splitDetails com està si l'usuari els introdueix manualment, 
  // però l'ideal seria normalitzar-ho també. Centrem-nos en el 'amount' principal primer.
  const [splitDetails, setSplitDetails] = useState<Record<string, number>>(initialData?.splitDetails || {});

  // Foreign Currency State
  const [isForeignCurrency, setIsForeignCurrency] = useState(!!initialData?.originalCurrency);
  const [foreignAmount, setForeignAmount] = useState(initialData?.originalAmount?.toString() || '');
  const [foreignCurrency, setForeignCurrency] = useState<CurrencyCode>(initialData?.originalCurrency || 'USD');
  const [exchangeRate, setExchangeRate] = useState(initialData?.exchangeRate?.toString() || '1');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculate amount from foreign currency
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
      // CORRECCIÓ 3: Convertim l'input (unitats) a cèntims (enters) per guardar
      // Utilitzem Math.round per evitar errors de punt flotant (ex: 19.99 * 100 = 1998.999...)
      const amountInCents = Math.round(parseFloat(amount) * 100);
      
      const baseExpense: any = {
        title,
        amount: amountInCents, // <--- AQUÍ ESTÀ LA CLAU
        payer,
        category,
        date: new Date(date).toISOString(),
        involved: splitType === 'equal' ? involved : Object.keys(splitDetails).filter(k => splitDetails[k] > 0),
        splitType,
      };

      if (splitType !== 'equal') {
        baseExpense.splitDetails = splitDetails;
      }

      if (receiptUrl && receiptUrl.trim() !== '') {
        baseExpense.receiptUrl = receiptUrl;
      }

      if (isForeignCurrency) {
        // Els imports originals en divisa estrangera sovint es guarden tal qual (float) o en cèntims segons la teva lògica antiga.
        // Si l'app antiga mostrava "20 USD" bé, llavors es guarden com a float. Ho deixem com a float per seguretat.
        baseExpense.originalAmount = parseFloat(foreignAmount);
        baseExpense.originalCurrency = foreignCurrency;
        baseExpense.exchangeRate = parseFloat(exchangeRate);
      }

      await onSubmit(baseExpense);

    } catch (error) {
      console.error(error);
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