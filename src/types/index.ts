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

// --- USUARI COM A OBJECTE (IMPORTANT PER LES FOTOS) ---
export interface TripUser {
  id: string;
  name: string;
  email?: string;
  isAuth?: boolean;
  linkedUid?: string;
  photoUrl?: string; // <--- LA FOTO
}

export type SplitType = 'equal' | 'exact' | 'shares';

export interface Expense {
  id: number | string;
  title: string;
  amount: number;
  payer: string;        // Guardarà l'ID
  category: CategoryId;
  involved: string[];   // Guardarà IDs
  date: string;         
  splitType?: SplitType; 
  splitDetails?: Record<string, number>; 
}

export interface TripData {
  id: string;
  name: string;
  users: TripUser[];    // Array d'objectes
  expenses: Expense[];
  currency: Currency;
  createdAt: string;
  memberUids?: string[]; 
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