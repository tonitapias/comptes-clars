import { LucideIcon } from 'lucide-react';

export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'JPY' | 'MXN';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  locale: string;
}

export type CategoryId = 'food' | 'transport' | 'home' | 'drinks' | 'travel' | 'tickets' | 'shopping' | 'entertainment' | 'transfer' | 'other' | 'all';

export interface Category {
  id: CategoryId;
  label: string;
  icon: LucideIcon;
  color: string;
  barColor: string;
}

export interface TripUser {
  id: string;
  name: string;
  email?: string;
  isAuth?: boolean;
  linkedUid?: string;
  photoUrl?: string;
  isDeleted?: boolean;
}

export type SplitType = 'equal' | 'exact' | 'shares';

export interface Expense {
  id: number | string;
  title: string;
  amount: number;
  payer: string;
  category: CategoryId;
  involved: string[];
  date: string;         
  splitType?: SplitType; 
  splitDetails?: Record<string, number>; 
}

// --- NOVETAT: ESTRUCTURA DEL LOG ---
export interface LogEntry {
  id: string;
  action: 'create' | 'update' | 'delete' | 'join' | 'settle' | 'settings';
  message: string;
  userId: string;      // ID de l'usuari (TripUser)
  userName: string;    // Nom en aquell moment
  timestamp: string;
}

export interface TripData {
  id: string;
  name: string;
  users: TripUser[];
  expenses: Expense[];
  currency: Currency;
  createdAt: string;
  memberUids?: string[];
  logs?: LogEntry[]; // <--- AFEGIT ARRAY DE LOGS
}

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