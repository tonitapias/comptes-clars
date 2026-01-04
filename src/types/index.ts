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

// --- NOUS TIPUS PER AL REPARTIMENT ---
export type SplitType = 'equal' | 'exact' | 'shares';

export interface Expense {
  id: number | string;
  title: string;
  amount: number;
  payer: string;
  category: CategoryId;
  involved: string[];
  date: string; // ISO String
  
  // --- CAMPS NOUS ---
  splitType?: SplitType; 
  splitDetails?: Record<string, number>; // Mapeja userID -> quantitat (o parts)
}

export interface TripData {
  id: string;
  name: string;
  users: string[];
  expenses: Expense[];
  currency: Currency;
  createdAt: string;
  memberUids?: string[]; 
}

export interface Balance {
  user: string;
  balance: number;
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