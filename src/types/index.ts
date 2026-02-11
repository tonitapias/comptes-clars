// src/types/index.ts
import { LucideIcon } from 'lucide-react';

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
  id: string;             
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
  amount: number;         // En cèntims (Integer)
  payer: string;          
  category: CategoryId;
  involved: string[];     
  date: string;           
  splitType?: SplitType;  
  splitDetails?: Record<string, number>; 
  receiptUrl?: string | null;
  
  originalAmount?: number;      
  originalCurrency?: CurrencyCode; 
  exchangeRate?: number;        
}

// --- LOGS I AUDITORIA ---
export interface LogEntry {
  id: string;
  action: 'create' | 'update' | 'delete' | 'join' | 'settle' | 'settings';
  message: string;
  userId: string;
  userName: string;
  timestamp: string;
}

// --- ESTRUCTURA PRINCIPAL (DOCUMENT) ---
export interface TripData {
  id: string;
  name: string;
  users: TripUser[];
  expenses: Expense[];
  currency: Currency;
  createdAt: string;
  memberUids?: string[];   
  logs?: LogEntry[];
  isDeleted?: boolean; // <--- NOVA PROPIETAT (SOFT DELETE)
}

// --- RESULTATS DE CÀLCULS ---
export interface Balance {
  userId: string;
  amount: number;
}

export interface Settlement {
  from: string; 
  to: string;   
  amount: number;
}

export interface CategoryStat extends Category {
  amount: number;
  percentage: number;
}