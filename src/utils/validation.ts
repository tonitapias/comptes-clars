// src/utils/validation.ts
import { z } from 'zod';

// Definim els tipus de repartiment manualment
const SPLIT_TYPES = ['equal', 'exact', 'shares'] as const;

// Validació d'Usuaris
export const TripUserSchema = z.object({
  id: z.string(), 
  // MILLORA: Limitem la longitud per evitar trencaments de UI i fem trim.
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
  
  // Enter (cèntims) i positiu.
  amount: z.number().int("L'import ha de ser un enter (cèntims)").positive("L'import ha de ser positiu").finite(), 
  
  payer: z.string().trim().min(1, "El pagador és obligatori"),
  
  category: z.enum(['food', 'transport', 'home', 'drinks', 'travel', 'tickets', 'shopping', 'entertainment', 'transfer', 'other', 'all']),
  
  // MILLORA: Assegurem que no hi hagi duplicats a la llista d'involucrats
  involved: z.array(z.string())
    .min(1, "Hi ha d'haver almenys una persona involucrada")
    .refine((items) => new Set(items).size === items.length, {
      message: "No es poden repetir persones a la mateixa despesa"
    }),
  
  date: z.string(), // ISO string
  
  splitType: z.enum(SPLIT_TYPES).optional(),
  
  // Els detalls han de ser enters (cèntims)
  splitDetails: z.record(z.string(), z.number().int().nonnegative()).optional(),
  
  receiptUrl: z.string().url("L'enllaç de la imatge no és vàlid").optional().nullable(),
  
  // Camps de divisa original
  originalAmount: z.number().positive().optional(),
  originalCurrency: z.enum(['EUR', 'USD', 'GBP', 'JPY', 'MXN']).optional(),
  exchangeRate: z.number().positive().optional()
})
// MILLORA UX: Eliminem la restricció estricta d'igualtat en 'exact'.
// Permetem que l'usuari assigni MENYS del total (la diferència l'assumeix el pagador implícitament).
// Això desbloqueja casos d'ús com "Tiquet de 50€, però només 20€ són del grup".
.refine((data) => {
  // Regla 1: Validació de consistència bàsica per a 'exact'
  if (data.splitType === 'exact' && data.splitDetails) {
    const sumDetails = Object.values(data.splitDetails).reduce((a, b) => a + b, 0);
    // Només comprovem que no reparteixin MÉS diners dels que val la factura
    return sumDetails <= data.amount;
  }
  return true;
}, {
  message: "La suma dels imports dividits supera l'import total de la despesa",
  path: ["splitDetails"] 
})
.refine((data) => {
  // Regla 2: Si és 'shares', ha d'haver-hi almenys una participació > 0
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
  id: z.union([z.string(), z.number()])
});

// Validació Completa del Viatge
export const TripDataSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "El nom del grup és obligatori").max(50),
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