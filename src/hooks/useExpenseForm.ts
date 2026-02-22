// src/hooks/useExpenseForm.ts

import { useState, useMemo } from 'react';
import { TripUser, Expense, Currency, SplitType } from '../types';
import { SPLIT_TYPES, CATEGORIES } from '../utils/constants';
import { ExpenseSchema } from '../utils/validation';
import { z } from 'zod';
import { ToastType } from '../components/Toast';

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
  currency: Currency; 
  onSubmit: (data: ExpenseFormData) => Promise<void>;
  showToast?: (msg: string, type: ToastType) => void;
}

export function useExpenseForm({ initialData, users, onSubmit, showToast }: UseExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      // [MILLORA PWA]: Hem eliminat el bloqueig offline. 
      // Si no hi ha xarxa, guardem en local (Optimistic UI) sense interrompre l'usuari.

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
             const firstMsg = error.issues[0]?.message || 'Error de validació';
             
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