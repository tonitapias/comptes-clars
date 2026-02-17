// src/types/index.ts
import { LucideIcon } from 'lucide-react';

// --- UTILITATS DE TIPUS (Branding) ---
declare const __brand: unique symbol;
export type Brand<K, T> = K & { readonly [__brand]: T };

// --- NOUS TIPUS SEMÀNTICS ---
export type MoneyCents = Brand<number, 'MoneyCents'>; 
export type UserId = string;
export type ISODateString = string;

// --- HELPERS ---
export const toCents = (n: number): MoneyCents => Math.round(n) as MoneyCents;
export const asCents = (n: number): MoneyCents => n as MoneyCents;
export const unbrand = (m: MoneyCents): number => m;

// --- MONEDA ---
export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'JPY' | 'MXN';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  locale: string;
  name: string; // <--- NOVA PROPIETAT
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
  amount: MoneyCents;     
  payer: UserId;          
  category: CategoryId;
  involved: UserId[];     
  date: ISODateString;           
  splitType?: SplitType;  
  splitDetails?: Record<UserId, MoneyCents>; 
  receiptUrl?: string | null;
  originalAmount?: number; 
  originalCurrency?: CurrencyCode; 
  exchangeRate?: number;       
}

// --- LOGS ---
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
  ownerId?: string; // <--- NOVA PROPIETAT (Opcional per compatibilitat)
  logs?: LogEntry[];
  isDeleted?: boolean; 
  isSettled?: boolean; 
}

// --- RESULTATS DE CÀLCULS ---
export interface Balance {
  userId: UserId;
  amount: MoneyCents;
}

export interface Settlement {
  from: UserId; 
  to: UserId;   
  amount: MoneyCents;
}

export interface CategoryStat extends Category {
  amount: MoneyCents;
  percentage: number;
}