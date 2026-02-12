// src/types/index.ts
import { LucideIcon } from 'lucide-react';

// --- UTILITATS DE TIPUS (Branding) ---
// Tècnica "Branded Types": Afegim una marca única a nivell de tipus.
// Risc Zero: Això desapareix completament al compilar (runtime) i no afecta el rendiment,
// però impedeix barrejar accidentalment 'MoneyCents' amb 'number' (ex: percentatges).
declare const __brand: unique symbol;
export type Brand<K, T> = K & { readonly [__brand]: T };

// --- NOUS TIPUS SEMÀNTICS (Robustesa) ---
// MoneyCents ara és un tipus exclusiu. 
// Ja no es pot fer: const a: MoneyCents = 10; (Donarà error)
// S'ha de fer: const a = toCents(10);
export type MoneyCents = Brand<number, 'MoneyCents'>; 
export type UserId = string;
export type ISODateString = string;

// --- HELPERS (Safe Casting) ---
// Funcions d'ús obligatori per convertir números a diners.
// Això fa explícit al codi quan estem "creant" diners.
export const toCents = (n: number): MoneyCents => Math.round(n) as MoneyCents; // Forcem enter per seguretat
export const asCents = (n: number): MoneyCents => n as MoneyCents; // Cast directe (confiança cega)
export const unbrand = (m: MoneyCents): number => m;

// --- MONEDA ---
export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'JPY' | 'MXN';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  locale: string;
}

// --- CATEGORIES ---
export type CategoryId = 'food' | 'transport' | 'home' | 'drinks' | 'travel' | 'tickets' | 'shopping' | 'entertainment' | 'transfer' | 'other' | 'all';

export interface Category {
  id: CategoryId;
  label: string;
  icon: LucideIcon;
  color: string;
  barColor: string;
}

// --- USUARIS ---
export interface TripUser {
  id: UserId;             
  name: string;           
  email?: string;         
  isAuth?: boolean;       
  linkedUid?: string | null;     
  photoUrl?: string | null;
  isDeleted?: boolean;    
}

// --- DESPESES ---
export type SplitType = 'equal' | 'exact' | 'shares';

export interface Expense {
  id: string | number;    
  title: string;
  amount: MoneyCents;     // Ara estricte: requereix toCents()
  payer: UserId;          
  category: CategoryId;
  involved: UserId[];     
  date: ISODateString;           
  splitType?: SplitType;  
  
  // Detalls: ID Usuari -> Quantitat en Cèntims
  splitDetails?: Record<UserId, MoneyCents>; 
  
  receiptUrl?: string | null;
  
  originalAmount?: number; // Pot tenir decimals (divisa original)
  originalCurrency?: CurrencyCode; 
  exchangeRate?: number;   // Float       
}

// --- LOGS I AUDITORIA ---
export interface LogEntry {
  id: string;
  action: 'create' | 'update' | 'delete' | 'join' | 'settle' | 'settings';
  message: string;
  userId: UserId;
  userName: string;
  timestamp: ISODateString;
}

// --- ESTRUCTURA PRINCIPAL (DOCUMENT) ---
export interface TripData {
  id: string;
  name: string;
  users: TripUser[];
  expenses: Expense[];
  currency: Currency;
  createdAt: ISODateString;
  memberUids?: string[];   
  logs?: LogEntry[];
  isDeleted?: boolean; 
  isSettled?: boolean; 
}

// --- RESULTATS DE CÀLCULS ---
export interface Balance {
  userId: UserId;
  amount: MoneyCents; // El saldo final també és un tipus estricte
}

export interface Settlement {
  from: UserId; 
  to: UserId;   
  amount: MoneyCents; // La transacció a fer
}

export interface CategoryStat extends Category {
  amount: MoneyCents;
  percentage: number; // Percentatge (0-100) és float, clarament diferenciat de MoneyCents
}