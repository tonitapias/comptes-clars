// src/types/index.ts
import { LucideIcon } from 'lucide-react';

// --- NOUS TIPUS SEMÀNTICS (Robustesa) ---
// Defineixen clarament què representen les primitives.
// Risc Zero: TypeScript ho compila com a 'number'/'string', sense impacte en runtime.
export type MoneyCents = number; // Sempre enter. Ex: 1000 = 10.00€
export type UserId = string;
export type ISODateString = string;

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
  amount: MoneyCents;     // Clarament definit com a cèntims
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
  amount: MoneyCents; // El saldo final també és en cèntims
}

export interface Settlement {
  from: UserId; 
  to: UserId;   
  amount: MoneyCents; // La transacció a fer
}

export interface CategoryStat extends Category {
  amount: MoneyCents;
  percentage: number; // Percentatge (0-100) sí que és float
}