// src/hooks/useExpenseForm.ts

import { useState, useMemo } from 'react';
import { TripUser, Expense, Currency, SplitType } from '../types';
import { SPLIT_TYPES, CATEGORIES } from '../utils/constants';
import { ExpenseSchema } from '../utils/validation';
import { z } from 'zod';
import { useTripState } from '../context/TripContext'; // [RISC ZERO]: Importem l'estat global per llegir la xarxa
import { ToastType } from '../components/Toast'; // [RISC ZERO]: Importem els tipus del Toast

// Inferim el tipus de sortida directament de l'esquema Zod
type ExpenseFormData = z.infer<typeof ExpenseSchema>;

interface ExpenseFormState {
  title: string;
  amount: string;
  payer: string;
  category: string;
  date: string;
  splitType: SplitType;
  involved: string[];
  splitDetails: Record<string, string>;
}

interface UseExpenseFormProps {
  initialData: Expense | null;
  users: TripUser[];
  currency: Currency; // La mantenim a la interfície per coherència amb qui crida el hook
  onSubmit: (data: ExpenseFormData) => Promise<void>;
  showToast?: (msg: string, type: ToastType) => void; // [RISC ZERO]: Fem que sigui opcional per no trencar cap integració existent
}

// CORRECCIÓ 1: Eliminem 'currency' de la desestructuració perquè no el fem servir dins la funció
export function useExpenseForm({ initialData, users, onSubmit, showToast }: UseExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // [RISC ZERO]: Extraiem l'estat de xarxa en temps real
  const { isOffline } = useTripState();

  // --- ESTAT INICIAL ---
  const initialAmount = initialData 
    ? (initialData.amount / 100).toFixed(2) 
    : '';

  const initialDetails: Record<string, string> = {};
  if (initialData?.splitDetails) {
    Object.entries(initialData.splitDetails).forEach(([uid, cents]) => {
      initialDetails[uid] = (cents / 100).toFixed(2);
    });
  }

  const [formState, setFormState] = useState<ExpenseFormState>({
    title: initialData?.title || '',
    amount: initialAmount,
    payer: initialData?.payer || (users[0]?.id || ''),
    category: initialData?.category || CATEGORIES[0].id,
    date: initialData?.date || new Date().toISOString().split('T')[0],
    splitType: initialData?.splitType || (SPLIT_TYPES.EQUAL as SplitType),
    involved: initialData?.involved || users.map(u => u.id),
    splitDetails: initialDetails
  });

  // --- SETTERS ---
  const setters = {
    setTitle: (v: string) => setFormState(s => ({ ...s, title: v })),
    setAmount: (v: string) => setFormState(s => ({ ...s, amount: v })),
    setPayer: (v: string) => setFormState(s => ({ ...s, payer: v })),
    setCategory: (v: string) => setFormState(s => ({ ...s, category: v })),
    setDate: (v: string) => setFormState(s => ({ ...s, date: v })),
    setSplitType: (v: SplitType) => setFormState(s => ({ ...s, splitType: v })),
  };

  // --- LOGIC ---
  const logic = {
    toggleInvolved: (uid: string) => {
      setFormState(prev => {
        const newInvolved = prev.involved.includes(uid)
          ? prev.involved.filter(id => id !== uid)
          : [...prev.involved, uid];
        return { ...prev, involved: newInvolved };
      });
    },
    
    handleDetailChange: (uid: string, value: string) => {
      setFormState(prev => ({
        ...prev,
        splitDetails: {
          ...prev.splitDetails,
          [uid]: value
        }
      }));
    },

    handleSubmit: async (e: React.FormEvent) => {
      e.preventDefault();

      // [RISC ZERO]: Lògica de bloqueig proactiva si no hi ha connexió
      if (isOffline) {
        if (showToast) {
          showToast("Acció no permesa sense connexió a Internet.", 'warning');
        } else {
          alert("Acció no permesa sense connexió a Internet."); // Fallback temporal fins que actualitzem el component pare
        }
        return; // Aturem la funció en sec, no mostrem espinners ni truquem a la DB
      }

      setIsSubmitting(true);

      try {
        const rawData = {
          ...formState,
          id: initialData?.id,
          splitDetails: formState.splitType === (SPLIT_TYPES.EQUAL as SplitType)
            ? undefined 
            : formState.splitDetails
        };

        const validatedData = ExpenseSchema.parse(rawData);

        await onSubmit(validatedData);

      } catch (error) {
        console.error("Validation Error:", error);
        
        if (error instanceof z.ZodError) {
             // CORRECCIÓ 2: Usem 'issues' en lloc de 'errors' per evitar conflictes de tipat
             const firstMsg = error.issues[0]?.message || 'Error de validació';
             
             // [RISC ZERO]: Fem servir el toast si existeix, sinó alert per mantenir la UI retrocompatible
             if (showToast) {
               showToast(firstMsg, 'error');
             } else {
               alert(firstMsg);
             }
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // --- COMPUTED: EXACT SPLIT STATS ---
  const exactSplitStats = useMemo(() => {
    if (formState.splitType !== (SPLIT_TYPES.EXACT as SplitType)) return null;

    const parseQuick = (val: string) => {
      const clean = val.replace(/,/g, '.');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : Math.round(num * 100);
    };

    const totalCents = parseQuick(formState.amount);
    const allocatedCents = Object.values(formState.splitDetails)
      .reduce((acc, val) => acc + parseQuick(val), 0);
    
    const remainderCents = totalCents - allocatedCents;

    return {
      totalCents,
      allocatedCents,
      remainderCents,
      isFullyAllocated: remainderCents === 0,
      isOverAllocated: remainderCents < 0
    };
  }, [formState.amount, formState.splitDetails, formState.splitType]);

  return { formState, setters, logic, isSubmitting, exactSplitStats };
}