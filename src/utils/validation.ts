// src/utils/validation.ts

import { z } from 'zod';
import { SPLIT_TYPES, CATEGORIES, CURRENCIES } from './constants';

// --- EXTRACCIÓ DE VALORS PER A ZOD ---
const SPLIT_TYPE_VALUES = Object.values(SPLIT_TYPES) as [string, ...string[]];
const CATEGORY_IDS = CATEGORIES.map(c => c.id) as [string, ...string[]];
const CURRENCY_CODES = CURRENCIES.map(c => c.code) as [string, ...string[]];

// --- HELPERS DE TRANSFORMACIÓ (SANITIZERS) ---

const normalizeCurrencyString = (val: string): string => {
  let clean = val.trim();
  
  if (clean.includes(',') && clean.includes('.')) {
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      clean = clean.replace(/,/g, '');
    }
  } 
  else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  } 
  else if (clean.includes('.')) {
    if ((clean.match(/\./g) || []).length > 1) {
      clean = clean.replace(/\./g, '');
    }
  }

  return clean;
};

const parseMoneyString = (val: string): number => {
  const cleanVal = normalizeCurrencyString(val);
  
  if (cleanVal === '' || isNaN(Number(cleanVal))) return 0;

  const [integerPart, decimalPart = ''] = cleanVal.split('.');
  const paddedDecimal = (decimalPart + '00').slice(0, 2);
  const centsString = `${integerPart}${paddedDecimal}`;
  const cents = parseInt(centsString, 10);

  return isNaN(cents) ? 0 : cents;
};

const currencyInputToCents = (val: unknown): unknown => {
  if (typeof val === 'string') {
    return parseMoneyString(val);
  }
  return val; 
};

// Validació de Moneda (Cèntims)
const MoneyAmountSchema = z.preprocess(
  currencyInputToCents,
  // CORRECCIÓ: Usem 'message' en lloc de 'invalid_type_error' per compatibilitat de tipus
  z.number({ message: "L'import ha de ser numèric" }) 
    .int("L'import intern ha de ser un enter (cèntims). S'han detectat decimals.")
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
  
  amount: MoneyAmountSchema,
  
  payer: z.string().trim().min(1, "El pagador és obligatori"),
  category: z.enum(CATEGORY_IDS),
  
  involved: z.array(z.string())
    .min(1, "Hi ha d'haver almenys una persona involucrada")
    .refine((items) => new Set(items).size === items.length, {
      message: "No es poden repetir persones a la mateixa despesa"
    }),
  
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "La data no és vàlida"
  }),
  
  splitType: z.enum(SPLIT_TYPE_VALUES).optional(),
  
  splitDetails: z.record(
    z.string(), 
    z.preprocess(
      currencyInputToCents,
      z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
    )
  ).optional(),
  
  receiptUrl: z.string().url("L'enllaç de la imatge no és vàlid").optional().nullable(),
  
  originalAmount: z.number().positive().optional(),
  originalCurrency: z.enum(CURRENCY_CODES).optional(),
  exchangeRate: z.number().positive().optional()
})
// REGLES DE NEGOCI

// Mode EXACT
.refine((data) => {
  if (data.splitType === SPLIT_TYPES.EXACT && data.splitDetails) {
    const sumDetails = Object.values(data.splitDetails).reduce((a, b) => a + (b || 0), 0);
    return sumDetails <= data.amount;
  }
  return true;
}, {
  message: "La suma de les parts assignades supera l'import total de la despesa.",
  path: ["splitDetails"] 
})

// Mode SHARES
.refine((data) => {
  if (data.splitType === SPLIT_TYPES.SHARES && data.splitDetails) {
    const totalShares = Object.values(data.splitDetails).reduce((a, b) => a + (b || 0), 0);
    return totalShares > 0;
  }
  return true;
}, {
  message: "Hi ha d'haver almenys una participació assignada.",
  path: ["splitDetails"]
})

// Integritat Referencial
.refine((data) => {
  if ((data.splitType === SPLIT_TYPES.EXACT || data.splitType === SPLIT_TYPES.SHARES) && data.splitDetails) {
    const involvedSet = new Set(data.involved);
    const detailUids = Object.keys(data.splitDetails);
    return detailUids.every(uid => involvedSet.has(uid));
  }
  return true;
}, {
  message: "Tots els usuaris amb assignació manual han de constar a la llista d'involucrats.",
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