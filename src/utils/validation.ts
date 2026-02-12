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
 * Parser de moneda de precisió entera ("Integer-based").
 * Evita completament l'ús de floats per prevenir errors IEEE 754.
 */
const parseMoneyString = (val: string): number => {
  // 1. Neteja: normalitzem coma a punt i eliminem espais
  const cleanVal = val.trim().replace(',', '.');
  
  // 2. Validació de format bàsic (per evitar NaN)
  if (cleanVal === '' || isNaN(Number(cleanVal))) return 0;

  // 3. Separació de part entera i decimal
  const [integerPart, decimalPart = ''] = cleanVal.split('.');

  // 4. Normalització de decimals (sempre 2 dígits)
  // "10.5" -> "50" | "10.05" -> "05" | "10" -> "00" | "10.123" -> "12" (truncat)
  const paddedDecimal = (decimalPart + '00').slice(0, 2);

  // 5. Concatenació segura i conversió a Enter
  // "10" + "50" = "1050" -> 1050
  const centsString = `${integerPart}${paddedDecimal}`;
  const cents = parseInt(centsString, 10);

  return isNaN(cents) ? 0 : cents;
};

/**
 * Transforma qualsevol input a CÈNTIMS (Enter).
 * Prioritza el parsing de text segur.
 */
const currencyInputToCents = (val: unknown): number => {
  if (typeof val === 'string') {
    return parseMoneyString(val);
  }
  
  if (typeof val === 'number') {
    // Si rebem un número (ex: de controls de tipus 'number'), 
    // l'assumim com a Unitats (Euros) i el convertim amb cura.
    // .toFixed(2) ens converteix a string segur "10.56" i usem el parser.
    return parseMoneyString(val.toFixed(2));
  }
  
  return 0;
};

/**
 * Validador de moneda robust.
 * Accepta Strings (input text) o Numbers, els converteix a Cèntims.
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
  
  // APLICACIÓ: El nou parser segur s'activa aquí
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
  
  // Validació de Detalls: També apliquem la transformació segura
  splitDetails: z.record(
    z.string(), 
    z.preprocess(
      (val) => currencyInputToCents(val),
      z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
    )
  ).optional(),
  
  receiptUrl: z.string().url("L'enllaç de la imatge no és vàlid").optional().nullable(),
  
  originalAmount: z.number().positive().optional(),
  originalCurrency: z.enum(CURRENCIES).optional(),
  exchangeRate: z.number().positive().optional()
})
// --- REGLES DE NEGOCI (Integrity Checks) ---

// REGLA 1: Mode EXACT (Suma <= Total)
.refine((data) => {
  if (data.splitType === 'exact' && data.splitDetails) {
    const sumDetails = Object.values(data.splitDetails).reduce((a, b) => a + b, 0);
    // Comprovem igualtat estricta, però permetem que sigui menor (cost propi)
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
    // Verifiquem que tothom qui paga (té detall) està a la llista d'involucrats
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