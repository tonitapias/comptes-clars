// src/utils/validation.ts
import { z } from 'zod';

// Validació d'Usuaris
export const TripUserSchema = z.object({
  id: z.string(), 
  name: z.string().min(1, "El nom no pot estar buit").max(50, "El nom és massa llarg"),
  email: z.string().email().optional(),
  isAuth: z.boolean().optional(),
  linkedUid: z.string().optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  isDeleted: z.boolean().optional()
});

// Validació Base de Despesa (sense ID, per a creació d'inputs)
// Aquest és el que fa servir tripService.addExpense
export const ExpenseSchema = z.object({
  title: z.string().min(1, "El títol és obligatori").max(100, "Títol massa llarg"),
  
  // MILLORA: Forcem que sigui ENTER (cèntims). Rebutgem floats per evitar errors IEEE 754.
  amount: z.number().int("L'import ha de ser un enter (cèntims)").positive("L'import ha de ser positiu").finite(), 
  
  payer: z.string().min(1, "El pagador és obligatori"),
  category: z.enum(['food', 'transport', 'home', 'drinks', 'travel', 'tickets', 'shopping', 'entertainment', 'transfer', 'other', 'all']),
  involved: z.array(z.string()).min(1, "Hi ha d'haver almenys una persona involucrada"),
  date: z.string(), // Acceptem qualsevol string per flexibilitat, idealment ISO
  splitType: z.enum(['equal', 'exact', 'shares']).optional(),
  
  // MILLORA: Els detalls del split també han de ser enters (cèntims)
  splitDetails: z.record(z.string(), z.number().int()).optional(),
  
  receiptUrl: z.string().url("L'enllaç de la imatge no és vàlid").optional().nullable(),
  
  // Camps de divisa original (poden tenir decimals si són la moneda origen, però l'amount principal és enter)
  originalAmount: z.number().positive().optional(),
  originalCurrency: z.enum(['EUR', 'USD', 'GBP', 'JPY', 'MXN']).optional(),
  exchangeRate: z.number().positive().optional()
});

// Schema per a despeses ja guardades (amb ID)
// Aquest el farem servir per validar l'estructura completa del viatge
const PersistedExpenseSchema = ExpenseSchema.extend({
  id: z.union([z.string(), z.number()]) // Suport per a legacy (number) i nous (UUID)
});

// Validació Completa del Viatge
export const TripDataSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "El nom del grup és obligatori"),
  users: z.array(TripUserSchema),
  expenses: z.array(PersistedExpenseSchema).default([]), 
  currency: z.object({
    code: z.enum(['EUR', 'USD', 'GBP', 'JPY', 'MXN']),
    symbol: z.string(),
    locale: z.string()
  }),
  createdAt: z.string(),
  memberUids: z.array(z.string()).optional(),
  logs: z.array(z.any()).optional() 
});