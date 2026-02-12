// src/utils/validation.ts

import { z } from 'zod';
import { SPLIT_TYPES, CATEGORIES, CURRENCIES } from './constants';

// --- EXTRACCIÓ DE VALORS PER A ZOD ---
const SPLIT_TYPE_VALUES = Object.values(SPLIT_TYPES) as [string, ...string[]];
const CATEGORY_IDS = CATEGORIES.map(c => c.id) as [string, ...string[]];
const CURRENCY_CODES = CURRENCIES.map(c => c.code) as [string, ...string[]];

// --- HELPERS DE TRANSFORMACIÓ (SANITIZERS) ---

/**
 * Normalitza un string de moneda a un format numèric estàndard (1234.56).
 * Gestiona intel·ligentment formats EU (1.000,50) i US (1,000.50).
 */
const normalizeCurrencyString = (val: string): string => {
  let clean = val.trim();
  
  // Cas 1: Format mixt (conté punts i comes) -> Ex: 1.000,50 o 1,000.50
  if (clean.includes(',') && clean.includes('.')) {
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // Format EU: 1.000,50 -> Eliminem punts, canviem coma per punt
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      // Format US: 1,000.50 -> Eliminem comes
      clean = clean.replace(/,/g, '');
    }
  } 
  // Cas 2: Només comes -> Ex: 10,50 -> Canviem a punt
  else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  } 
  // Cas 3: Només punts
  else if (clean.includes('.')) {
    // Si hi ha més d'un punt, són milers -> Ex: 1.000.000 -> Eliminem tots
    if ((clean.match(/\./g) || []).length > 1) {
      clean = clean.replace(/\./g, '');
    }
    // Si només hi ha un punt (10.50 o 1.000), assumim estàndard JS (Decimal)
    // NOTA: Això implica que 1.000 serà 1, no 1000. És el comportament segur estàndard.
  }

  return clean;
};

/**
 * Parser de moneda de precisió entera ("Integer-based").
 * Converteix strings d'entrada a cèntims (1050).
 */
const parseMoneyString = (val: string): number => {
  // Pas 1: Normalització robusta (FIX CRÍTIC)
  const cleanVal = normalizeCurrencyString(val);
  
  if (cleanVal === '' || isNaN(Number(cleanVal))) return 0;

  const [integerPart, decimalPart = ''] = cleanVal.split('.');
  // Assegurem sempre 2 decimals
  const paddedDecimal = (decimalPart + '00').slice(0, 2);
  const centsString = `${integerPart}${paddedDecimal}`;
  const cents = parseInt(centsString, 10);

  return isNaN(cents) ? 0 : cents;
};

/**
 * Transforma l'input a CÈNTIMS (Enter).
 * MILLORA CRÍTICA (Fix Double Conversion):
 * - Si és String: S'entén com a Unitats (User Input) -> Converteix a Cèntims.
 * - Si és Number: S'entén com a Cèntims (Internal Data) -> Passa directament (Pass-through).
 * La validació posterior .int() s'encarregarà de rebutjar floats (ex: 10.5).
 */
const currencyInputToCents = (val: unknown): unknown => {
  if (typeof val === 'string') {
    return parseMoneyString(val);
  }
  // Si ja és un número, assumim que ve del sistema (cèntims) i no el toquem.
  return val; 
};

/**
 * Validador de moneda robust.
 * Accepta Strings (que converteix) o Enters. Rebutja Floats.
 */
const MoneyAmountSchema = z.preprocess(
  currencyInputToCents,
  z.number({ invalid_type_error: "L'import ha de ser numèric" })
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
  
  // APLICACIÓ: Parser segur híbrid (String/Int)
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
  
  // Els detalls també han de ser tractats amb cura (MoneyAmountSchema o similar)
  // Aquí fem servir preprocess individual per a cada valor del mapa
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
// --- REGLES DE NEGOCI (Integrity Checks) ---

// REGLA 1: Mode EXACT (Suma <= Total)
// Permetem que la suma sigui menor (el pagador assumeix la resta), però mai major.
.refine((data) => {
  if (data.splitType === SPLIT_TYPES.EXACT && data.splitDetails) {
    const sumDetails = Object.values(data.splitDetails).reduce((a, b) => a + b, 0);
    // Utilitzem una tolerància 0 estricta ja que treballem amb enters
    return sumDetails <= data.amount;
  }
  return true;
}, {
  message: "La suma de les parts assignades supera l'import total de la despesa.",
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
  message: "Hi ha d'haver almenys una participació assignada.",
  path: ["splitDetails"]
})

// REGLA 3: Integritat Referencial
.refine((data) => {
  if ((data.splitType === SPLIT_TYPES.EXACT || data.splitType === SPLIT_TYPES.SHARES) && data.splitDetails) {
    const involvedSet = new Set(data.involved);
    const detailUids = Object.keys(data.splitDetails);
    // Verifiquem que cada ID al mapa de detalls existeixi a la llista d'involucrats
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