// src/utils/validation.ts
import { z } from 'zod';

// Definim els tipus de repartiment manualment per evitar dependències circulars
const SPLIT_TYPES = ['equal', 'exact', 'shares'] as const;

// Validació d'Usuaris
export const TripUserSchema = z.object({
  id: z.string(), 
  // MILLORA: Afegim .trim() per netejar entrades brutes
  name: z.string().trim().min(1, "El nom no pot estar buit").max(50, "El nom és massa llarg"),
  email: z.string().email().optional(),
  isAuth: z.boolean().optional(),
  linkedUid: z.string().optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  isDeleted: z.boolean().optional()
});

// Validació Base de Despesa
export const ExpenseSchema = z.object({
  title: z.string().trim().min(1, "El títol és obligatori").max(100, "Títol massa llarg"),
  
  // MILLORA: Forcem enter (cèntims) i positiu.
  amount: z.number().int("L'import ha de ser un enter (cèntims)").positive("L'import ha de ser positiu").finite(), 
  
  payer: z.string().trim().min(1, "El pagador és obligatori"),
  
  category: z.enum(['food', 'transport', 'home', 'drinks', 'travel', 'tickets', 'shopping', 'entertainment', 'transfer', 'other', 'all']),
  
  involved: z.array(z.string()).min(1, "Hi ha d'haver almenys una persona involucrada"),
  
  date: z.string(), // Acceptem ISO string
  
  splitType: z.enum(SPLIT_TYPES).optional(),
  
  // Els detalls han de ser enters (cèntims)
  splitDetails: z.record(z.string(), z.number().int()).optional(),
  
  receiptUrl: z.string().url("L'enllaç de la imatge no és vàlid").optional().nullable(),
  
  // Camps de divisa original
  originalAmount: z.number().positive().optional(),
  originalCurrency: z.enum(['EUR', 'USD', 'GBP', 'JPY', 'MXN']).optional(),
  exchangeRate: z.number().positive().optional()
})
// MILLORA CRÍTICA: Validació de lògica de negoci (Refinement)
.refine((data) => {
  // Regla 1: Si és 'exact', la suma dels detalls ha de quadrar amb el total
  if (data.splitType === 'exact' && data.splitDetails) {
    const sumDetails = Object.values(data.splitDetails).reduce((a, b) => a + b, 0);
    // Admetem una diferència de 0 per ser estrictes, ja que treballem amb enters
    return sumDetails === data.amount;
  }
  return true;
}, {
  message: "La suma dels imports dividits no coincideix amb l'import total",
  path: ["splitDetails"] // L'error s'associarà a aquest camp
})
.refine((data) => {
  // Regla 2: Si és 'shares', ha d'haver-hi almenys una participació definida
  if (data.splitType === 'shares' && data.splitDetails) {
    const totalShares = Object.values(data.splitDetails).reduce((a, b) => a + b, 0);
    return totalShares > 0;
  }
  return true;
}, {
  message: "Hi ha d'haver almenys una participació assignada",
  path: ["splitDetails"]
});

// Schema per a despeses ja guardades (amb ID)
const PersistedExpenseSchema = ExpenseSchema.extend({
  id: z.union([z.string(), z.number()]) // Suport legacy i UUID
});

// Validació Completa del Viatge
export const TripDataSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "El nom del grup és obligatori"),
  users: z.array(TripUserSchema),
  expenses: z.array(PersistedExpenseSchema),
  currency: z.object({
    code: z.enum(['EUR', 'USD', 'GBP', 'JPY', 'MXN']),
    symbol: z.string(),
    locale: z.string()
  }),
  createdAt: z.string(),
  memberUids: z.array(z.string()).optional(),
  isDeleted: z.boolean().optional(),
  isSettled: z.boolean().optional()
});