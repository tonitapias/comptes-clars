// src/utils/validation.ts
import { z } from 'zod';
import { SPLIT_TYPES, CATEGORIES, CURRENCIES } from './constants'; // [FIX] Importació centralitzada

// --- EXTRACCIÓ DE VALORS PER A ZOD ---
// Necessitem convertir els objectes de configuració a tuples d'strings per a Zod.
// Això assegura que si afegim una categoria a constants.ts, automàticament és vàlida aquí.

const SPLIT_TYPE_VALUES = Object.values(SPLIT_TYPES) as [string, ...string[]];

const CATEGORY_IDS = CATEGORIES.map(c => c.id) as [string, ...string[]];

const CURRENCY_CODES = CURRENCIES.map(c => c.code) as [string, ...string[]];


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
  const paddedDecimal = (decimalPart + '00').slice(0, 2);

  // 5. Concatenació segura i conversió a Enter
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
    return parseMoneyString(val.toFixed(2));
  }
  
  return 0;
};

/**
 * Validador de moneda robust.
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
  
  // APLICACIÓ: Parser segur
  amount: MoneyAmountSchema,
  
  payer: z.string().trim().min(1, "El pagador és obligatori"),
  
  // [FIX] Ús dinàmic de les categories definides a constants
  category: z.enum(CATEGORY_IDS),
  
  involved: z.array(z.string())
    .min(1, "Hi ha d'haver almenys una persona involucrada")
    .refine((items) => new Set(items).size === items.length, {
      message: "No es poden repetir persones a la mateixa despesa"
    }),
  
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "La data no és vàlida"
  }),
  
  // [FIX] Ús dinàmic dels tipus de repartiment
  splitType: z.enum(SPLIT_TYPE_VALUES).optional(),
  
  splitDetails: z.record(
    z.string(), 
    z.preprocess(
      (val) => currencyInputToCents(val),
      z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
    )
  ).optional(),
  
  receiptUrl: z.string().url("L'enllaç de la imatge no és vàlid").optional().nullable(),
  
  originalAmount: z.number().positive().optional(),
  // [FIX] Ús dinàmic de les divises
  originalCurrency: z.enum(CURRENCY_CODES).optional(),
  exchangeRate: z.number().positive().optional()
})
// --- REGLES DE NEGOCI (Integrity Checks) ---

// REGLA 1: Mode EXACT (Suma <= Total)
.refine((data) => {
  if (data.splitType === SPLIT_TYPES.EXACT && data.splitDetails) {
    const sumDetails = Object.values(data.splitDetails).reduce((a, b) => a + b, 0);
    return sumDetails <= data.amount;
  }
  return true;
}, {
  message: "La suma de les parts supera l'import total",
  path: ["splitDetails"] 
})

// REGLA 2: Mode SHARES (Participacions > 0)
.refine((data) => {
  if (data.splitType === SPLIT_TYPES.SHARES && data.splitDetails) {
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
  if ((data.splitType === SPLIT_TYPES.EXACT || data.splitType === SPLIT_TYPES.SHARES) && data.splitDetails) {
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
    code: z.enum(CURRENCY_CODES),
    symbol: z.string(),
    locale: z.string()
  }),
  createdAt: z.string(),
  memberUids: z.array(z.string()).optional(),
  isDeleted: z.boolean().optional(),
  isSettled: z.boolean().optional()
});