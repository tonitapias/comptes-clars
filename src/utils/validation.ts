// src/utils/validation.ts
import { z } from 'zod';

// CONSTANTS
const SPLIT_TYPES = ['equal', 'exact', 'shares'] as const;
const CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'MXN'] as const;
const CATEGORIES = [
  'food', 'transport', 'home', 'drinks', 'travel', 
  'tickets', 'shopping', 'entertainment', 'transfer', 
  'other', 'all'
] as const;

// Validació d'Usuaris
export const TripUserSchema = z.object({
  id: z.string().min(1), 
  name: z.string().trim().min(1, "El nom no pot estar buit").max(30, "El nom és massa llarg (màx 30)"),
  email: z.string().email("L'email no és vàlid").optional().or(z.literal('')), // Permet string buit o email vàlid
  isAuth: z.boolean().optional(),
  linkedUid: z.string().optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  isDeleted: z.boolean().optional()
});

// Validació Base de Despesa
export const ExpenseSchema = z.object({
  title: z.string().trim().min(1, "El títol és obligatori").max(50, "Títol massa llarg (màx 50)"),
  
  // SEGURETAT NUMÈRICA:
  // 1. Ha de ser enter (MoneyCents treballa sense decimals)
  // 2. Ha de ser positiu (no acceptem despeses negatives ni zero)
  // 3. No pot superar el límit de precisió de JS (9e15)
  amount: z.number()
    .int("L'import ha de ser un enter (cèntims)")
    .positive("L'import ha de ser major que 0")
    .max(Number.MAX_SAFE_INTEGER, "L'import excedeix el límit segur")
    .finite(), 
  
  payer: z.string().trim().min(1, "El pagador és obligatori"),
  
  category: z.enum(CATEGORIES),
  
  // Integritat de participants
  involved: z.array(z.string())
    .min(1, "Hi ha d'haver almenys una persona involucrada")
    .refine((items) => new Set(items).size === items.length, {
      message: "No es poden repetir persones a la mateixa despesa"
    }),
  
  // SEGURETAT DE DATES: Comprovem que sigui una data real
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "La data no és vàlida"
  }),
  
  splitType: z.enum(SPLIT_TYPES).optional(),
  
  // Validació de Detalls (Mode Exacte/Shares)
  splitDetails: z.record(
    z.string(), 
    z.number()
      .int()
      .nonnegative("No es poden assignar valors negatius")
      .max(Number.MAX_SAFE_INTEGER)
  ).optional(),
  
  receiptUrl: z.string().url("L'enllaç de la imatge no és vàlid").optional().nullable(),
  
  // Camps informatius (floats permesos aquí, només per display/conversió)
  originalAmount: z.number().positive().optional(),
  originalCurrency: z.enum(CURRENCIES).optional(),
  exchangeRate: z.number().positive().optional()
})
// --- REGLES DE NEGOCI AVANÇADES (REFINE) ---

// REGLA 1: Consistència Matemàtica en mode EXACT
// Permetem que (Suma Detalls) <= (Total).
// Si és menor, 'billingService' assignarà la diferència al pagador (Pagador paga la resta).
// MAI pot ser major, ja que crearia diners del no-res.
.refine((data) => {
  if (data.splitType === 'exact' && data.splitDetails) {
    const sumDetails = Object.values(data.splitDetails).reduce((a, b) => a + b, 0);
    return sumDetails <= data.amount;
  }
  return true;
}, {
  message: "La suma de les parts supera l'import total de la despesa",
  path: ["splitDetails"] 
})

// REGLA 2: Consistència en mode SHARES
// Si dividim per participacions, n'hi ha d'haver com a mínim 1.
.refine((data) => {
  if (data.splitType === 'shares' && data.splitDetails) {
    const totalShares = Object.values(data.splitDetails).reduce((a, b) => a + b, 0);
    return totalShares > 0;
  }
  return true;
}, {
  message: "Hi ha d'haver almenys una participació assignada",
  path: ["splitDetails"]
})

// REGLA 3: Integritat Referencial
// Si algú té un import/participació assignat, HA de ser a la llista d'involucrats.
.refine((data) => {
  if ((data.splitType === 'exact' || data.splitType === 'shares') && data.splitDetails) {
    const involvedSet = new Set(data.involved);
    const detailUids = Object.keys(data.splitDetails);
    
    // Verifiquem que no hi ha claus òrfenes a splitDetails
    return detailUids.every(uid => involvedSet.has(uid));
  }
  return true;
}, {
  message: "Tots els usuaris amb assignació han de constar com a involucrats",
  path: ["involved"] 
});

// Schema per a despeses ja guardades (amb ID)
const PersistedExpenseSchema = ExpenseSchema.extend({
  id: z.union([z.string(), z.number()])
});

// Validació Completa del Viatge (Document sencer)
export const TripDataSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "El nom del grup és obligatori").max(50),
  users: z.array(TripUserSchema),
  expenses: z.array(PersistedExpenseSchema),
  currency: z.object({
    code: z.enum(CURRENCIES),
    symbol: z.string(),
    locale: z.string()
  }),
  createdAt: z.string(),
  memberUids: z.array(z.string()).optional(),
  isDeleted: z.boolean().optional(),
  isSettled: z.boolean().optional()
});