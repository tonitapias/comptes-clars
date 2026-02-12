// src/utils/validation.ts
import { z } from 'zod';

// CONSTANTS (Centralitzades per consistència)
const SPLIT_TYPES = ['equal', 'exact', 'shares'] as const;
const CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'MXN'] as const;
const CATEGORIES = [
  'food', 'transport', 'home', 'drinks', 'travel', 
  'tickets', 'shopping', 'entertainment', 'transfer', 
  'other', 'all'
] as const;

// Validació d'Usuaris
export const TripUserSchema = z.object({
  id: z.string(), 
  name: z.string().trim().min(1, "El nom no pot estar buit").max(30, "El nom és massa llarg (màx 30)"),
  email: z.string().email().optional(),
  isAuth: z.boolean().optional(),
  linkedUid: z.string().optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  isDeleted: z.boolean().optional()
});

// Validació Base de Despesa
export const ExpenseSchema = z.object({
  title: z.string().trim().min(1, "El títol és obligatori").max(50, "Títol massa llarg (màx 50)"),
  
  // Enter (cèntims) i positiu ( > 0 )
  amount: z.number().int("L'import ha de ser un enter (cèntims)").positive("L'import ha de ser positiu").finite(), 
  
  payer: z.string().trim().min(1, "El pagador és obligatori"),
  
  category: z.enum(CATEGORIES),
  
  // Validem que no hi hagi duplicats a la llista d'involucrats
  involved: z.array(z.string())
    .min(1, "Hi ha d'haver almenys una persona involucrada")
    .refine((items) => new Set(items).size === items.length, {
      message: "No es poden repetir persones a la mateixa despesa"
    }),
  
  date: z.string(), // ISO string
  
  splitType: z.enum(SPLIT_TYPES).optional(),
  
  // Els detalls han de ser enters (cèntims) i no negatius
  splitDetails: z.record(z.string(), z.number().int().nonnegative()).optional(),
  
  receiptUrl: z.string().url("L'enllaç de la imatge no és vàlid").optional().nullable(),
  
  // Camps de divisa original
  originalAmount: z.number().positive().optional(),
  originalCurrency: z.enum(CURRENCIES).optional(),
  exchangeRate: z.number().positive().optional()
})
// REGLA 1: Consistència en mode EXACT (Suma <= Total)
// Permetem assignar MENYS del total (l'usuari assumeix que el pagador cobreix la resta).
// Però mai MÉS del total.
.refine((data) => {
  if (data.splitType === 'exact' && data.splitDetails) {
    const sumDetails = Object.values(data.splitDetails).reduce((a, b) => a + b, 0);
    return sumDetails <= data.amount;
  }
  return true;
}, {
  message: "La suma dels imports dividits supera l'import total",
  path: ["splitDetails"] 
})
// REGLA 2: Consistència en mode SHARES (Total shares > 0)
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
// REGLA 3 (NOVA): Integritat Referencial Involved vs Details
// Si un usuari té assignat un import/participació a 'splitDetails',
// HA DE figurar obligatòriament a la llista 'involved'.
.refine((data) => {
  if ((data.splitType === 'exact' || data.splitType === 'shares') && data.splitDetails) {
    const involvedSet = new Set(data.involved);
    const detailUids = Object.keys(data.splitDetails);
    
    // Retorna true si TOTS els IDs de detalls estan presents a involved
    return detailUids.every(uid => involvedSet.has(uid));
  }
  return true;
}, {
  message: "Tots els usuaris amb assignació específica han de constar com a involucrats",
  path: ["involved"] // Marquem l'error al camp involved per suggerir afegir l'usuari
});

// Schema per a despeses ja guardades (amb ID)
const PersistedExpenseSchema = ExpenseSchema.extend({
  id: z.union([z.string(), z.number()])
});

// Validació Completa del Viatge
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