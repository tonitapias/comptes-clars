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

// --- HELPERS DE TRANSFORMACIÓ (SANITIZERS) ---

/**
 * Transforma qualsevol input numèric (string amb coma/punt o float) a CÈNTIMS (Enter).
 * Ex: "10,50" -> 1050 | 10.5 -> 1050 | "10" -> 1000
 */
const currencyInputToCents = (val: unknown): number => {
  if (typeof val === 'number') {
    // Si ja és enter (suposem cèntims), el deixem, si és float petit, el tractem com unitats? 
    // PER SEGURETAT: Assumim que l'input de formulari cru sol ser en unitats (Euros).
    // Cas especial: Si és un enter molt gran, potser ja són cèntims? 
    // Per consistència en formularis, tractem tot com a Unitats (Euros) que cal passar a Cèntims.
    return Math.round(val * 100);
  }
  
  if (typeof val === 'string') {
    // Normalitzem coma a punt (10,50 -> 10.50)
    const normalized = val.replace(',', '.').trim();
    const parsed = parseFloat(normalized);
    if (isNaN(parsed)) return 0; // O deixem que z.number() falli després
    return Math.round(parsed * 100);
  }
  
  return 0;
};

/**
 * Validador de moneda robust ("Foolproof").
 * Accepta Strings o Numbers, els converteix a Cèntims, i valida que sigui positiu.
 */
const MoneyAmountSchema = z.preprocess(
  currencyInputToCents,
  z.number()
    .int("L'import ha de ser un enter (cèntims)")
    .positive("L'import ha de ser major que 0")
    .max(Number.MAX_SAFE_INTEGER, "L'import excedeix el límit segur")
);


// --- SCHEMAS ---

export const TripUserSchema = z.object({
  id: z.string().min(1), 
  name: z.string().trim().min(1, "El nom no pot estar buit").max(30, "El nom és massa llarg (màx 30)"),
  email: z.string().email("L'email no és vàlid").optional().or(z.literal('')), 
  isAuth: z.boolean().optional(),
  linkedUid: z.string().optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  isDeleted: z.boolean().optional()
});

export const ExpenseSchema = z.object({
  title: z.string().trim().min(1, "El títol és obligatori").max(50, "Títol massa llarg (màx 50)"),
  
  // MILLORA: Ús del transformador intel·ligent
  // Ara accepta "12,50" des del formulari i ho guarda com 1250 automàticament.
  amount: MoneyAmountSchema,
  
  payer: z.string().trim().min(1, "El pagador és obligatori"),
  category: z.enum(CATEGORIES),
  
  involved: z.array(z.string())
    .min(1, "Hi ha d'haver almenys una persona involucrada")
    .refine((items) => new Set(items).size === items.length, {
      message: "No es poden repetir persones a la mateixa despesa"
    }),
  
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "La data no és vàlida"
  }),
  
  splitType: z.enum(SPLIT_TYPES).optional(),
  
  // Validació de Detalls: També apliquem la transformació a cèntims per si s'introdueixen a mà
  splitDetails: z.record(
    z.string(), 
    z.preprocess(
      // Si el valor ve de formulari (input manual), el convertim. 
      // Si ve de DB (ja cèntims), cal vigilar. 
      // *NOTA D'AUDITORIA*: En formularis d'edició, normalment treballem en unitats.
      // Assumim inputs d'UI (Euros).
      (val) => (typeof val === 'string' ? currencyInputToCents(val) : val),
      z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
    )
  ).optional(),
  
  receiptUrl: z.string().url("L'enllaç de la imatge no és vàlid").optional().nullable(),
  
  originalAmount: z.number().positive().optional(),
  originalCurrency: z.enum(CURRENCIES).optional(),
  exchangeRate: z.number().positive().optional()
})
// --- REGLES DE NEGOCI (REFINE) ---

// REGLA 1: Mode EXACT (Suma <= Total)
.refine((data) => {
  if (data.splitType === 'exact' && data.splitDetails) {
    const sumDetails = Object.values(data.splitDetails).reduce((a, b) => a + b, 0);
    // Tolerància zero: treballem amb enters
    return sumDetails <= data.amount;
  }
  return true;
}, {
  message: "La suma de les parts supera l'import total",
  path: ["splitDetails"] 
})

// REGLA 2: Mode SHARES (Participacions > 0)
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
.refine((data) => {
  if ((data.splitType === 'exact' || data.splitType === 'shares') && data.splitDetails) {
    const involvedSet = new Set(data.involved);
    const detailUids = Object.keys(data.splitDetails);
    return detailUids.every(uid => involvedSet.has(uid));
  }
  return true;
}, {
  message: "Tots els usuaris amb assignació han de constar com a involucrats",
  path: ["involved"] 
});

export const PersistedExpenseSchema = ExpenseSchema.extend({
  id: z.union([z.string(), z.number()])
});

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