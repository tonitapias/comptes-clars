// src/hooks/useExpenseForm.ts

import { useState, useEffect, useMemo } from 'react';
import { TripUser, Expense, Currency, SplitType, toCents, MoneyCents } from '../types';
import { SPLIT_TYPES, CATEGORIES } from '../utils/constants';
import { ExpenseSchema } from '../utils/validation';
import { z } from 'zod';

// Tipus auxiliar per a l'estat del formulari (Tot String per a millor UX)
interface ExpenseFormState {
  title: string;
  amount: string; // String per Input Masking
  payer: string;
  category: string;
  date: string;
  splitType: SplitType;
  involved: string[];
  splitDetails: Record<string, string>; // String per Input Masking
}

interface UseExpenseFormProps {
  initialData: Expense | null;
  users: TripUser[];
  currency: Currency;
  onSubmit: (data: any) => Promise<void>; // El tipus real serà inferit per Zod
}

export function useExpenseForm({ initialData, users, currency, onSubmit }: UseExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- ESTAT INICIAL ---
  // Convertim cèntims a string formatat (Ex: 1050 -> "10.50") per a l'edició
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
    splitType: initialData?.splitType || SPLIT_TYPES.EQUAL,
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
      setIsSubmitting(true);

      try {
        // 1. Preparem l'objecte cru (Raw)
        // La màgia de Zod a 'validation.ts' s'encarregarà de convertir strings a cèntims
        const rawData = {
          ...formState,
          id: initialData?.id, // Mantenim ID si editem
          // Netegem splitDetails de valors buits o zero
          splitDetails: formState.splitType === SPLIT_TYPES.EQUAL 
            ? undefined 
            : formState.splitDetails
        };

        // 2. Validació i Transformació (Safety First)
        // Això llançarà error si les regles de negoci (com Exact Split sum) no es compleixen
        const validatedData = ExpenseSchema.parse(rawData);

        // 3. Enviament
        await onSubmit(validatedData);

      } catch (error) {
        console.error("Validation Error:", error);
        // Aquí podríem connectar amb un sistema de Toast d'errors si fos necessari
        if (error instanceof z.ZodError) {
             const firstMsg = error.errors[0]?.message || 'Error de validació';
             alert(firstMsg); // Fallback simple
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // --- COMPUTED: EXACT SPLIT STATS (Feedback Visual) ---
  const exactSplitStats = useMemo(() => {
    if (formState.splitType !== SPLIT_TYPES.EXACT) return null;

    // Helper intern per parsejar (duplicat minim de validation per a feedback UI ràpid)
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