import { z } from 'zod';

// Esquema per a usuaris del viatge
export const TripUserSchema = z.object({
  id: z.string().uuid().or(z.string().min(1)), 
  name: z.string().min(1, "El nom no pot estar buit").max(50, "El nom és massa llarg"),
  email: z.string().email().optional(),
  isAuth: z.boolean().optional(),
  linkedUid: z.string().optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  isDeleted: z.boolean().optional()
});

// Esquema per a despeses
export const ExpenseSchema = z.object({
  title: z.string().min(1, "El títol és obligatori").max(100, "Títol massa llarg"),
  amount: z.number().positive("L'import ha de ser positiu").finite(), 
  payer: z.string().min(1, "El pagador és obligatori"),
  category: z.enum(['food', 'transport', 'home', 'drinks', 'travel', 'tickets', 'shopping', 'entertainment', 'transfer', 'other', 'all']),
  involved: z.array(z.string()).min(1, "Hi ha d'haver almenys una persona involucrada"),
  date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)), 
  splitType: z.enum(['equal', 'exact', 'shares']).optional(),
  splitDetails: z.record(z.string(), z.number()).optional(),
  receiptUrl: z.string().url("L'enllaç de la imatge no és vàlid").optional().nullable(),
  originalAmount: z.number().positive().optional(),
  originalCurrency: z.enum(['EUR', 'USD', 'GBP', 'JPY', 'MXN']).optional(),
  exchangeRate: z.number().positive().optional()
});

// Esquema per crear un viatge (CORREGIT)
export const TripDataSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "El nom del grup és obligatori"),
  users: z.array(TripUserSchema),
  expenses: z.array(ExpenseSchema).default([]), // <--- AFEGIT (abans s'esborrava!)
  currency: z.object({
    code: z.enum(['EUR', 'USD', 'GBP', 'JPY', 'MXN']),
    symbol: z.string(),
    locale: z.string()
  }),
  createdAt: z.string(), // <--- AFEGIT (Això arregla el problema de la data buida)
  memberUids: z.array(z.string()).optional(),
  logs: z.array(z.any()).optional() // <--- AFEGIT (Per si de cas, tot i que ho gestionem manualment)
});