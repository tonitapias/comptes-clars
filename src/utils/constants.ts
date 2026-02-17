import { 
  Utensils, Car, Home, Beer, Plane, ShoppingBag, 
  Music, Banknote, HelpCircle, Ticket, Filter,
  Users, Calculator, PieChart
} from 'lucide-react';
import { Category, Currency } from '../types';

// --- CONSTANTS DE DOMINI ---

export const SPLIT_TYPES = {
  EQUAL: 'equal',
  EXACT: 'exact',
  SHARES: 'shares',
} as const;

// --- CONFIGURACIÓ UI ---

export const UI_SPLIT_MODES = [
  { 
    id: SPLIT_TYPES.EQUAL, 
    label: 'Equitatiu', 
    icon: Users 
  },
  { 
    id: SPLIT_TYPES.EXACT, 
    label: 'Exacte', 
    icon: Calculator 
  },
  { 
    id: 'percent', 
    label: 'Percentatge', 
    icon: PieChart,
    mappedType: SPLIT_TYPES.SHARES 
  },
] as const;

// --- DADES ESTÀTIQUES ---

export const CATEGORIES: Category[] = [
  { id: 'all', label: 'Totes', icon: Filter, color: 'bg-slate-100 text-slate-600', barColor: 'bg-slate-400' },
  { id: 'food', label: 'Menjar', icon: Utensils, color: 'bg-orange-100 text-orange-600', barColor: 'bg-orange-500' },
  { id: 'transport', label: 'Transport', icon: Car, color: 'bg-blue-100 text-blue-600', barColor: 'bg-blue-500' },
  { id: 'home', label: 'Allotjament', icon: Home, color: 'bg-indigo-100 text-indigo-600', barColor: 'bg-indigo-500' },
  { id: 'drinks', label: 'Festa', icon: Beer, color: 'bg-purple-100 text-purple-600', barColor: 'bg-purple-500' },
  { id: 'travel', label: 'Viatge', icon: Plane, color: 'bg-sky-100 text-sky-600', barColor: 'bg-sky-500' },
  { id: 'tickets', label: 'Entrades', icon: Ticket, color: 'bg-rose-100 text-rose-600', barColor: 'bg-rose-500' },
  { id: 'shopping', label: 'Compres', icon: ShoppingBag, color: 'bg-pink-100 text-pink-600', barColor: 'bg-pink-500' },
  { id: 'entertainment', label: 'Oci', icon: Music, color: 'bg-teal-100 text-teal-600', barColor: 'bg-teal-500' },
  { id: 'transfer', label: 'Transferència', icon: Banknote, color: 'bg-emerald-100 text-emerald-600', barColor: 'bg-emerald-500' },
  { id: 'other', label: 'Altres', icon: HelpCircle, color: 'bg-slate-100 text-slate-600', barColor: 'bg-slate-500' },
];

export const CURRENCIES: Currency[] = [
  { code: 'EUR', symbol: '€', locale: 'ca-ES', name: 'Euro' },
  { code: 'USD', symbol: '$', locale: 'en-US', name: 'Dòlar EUA' },
  { code: 'GBP', symbol: '£', locale: 'en-GB', name: 'Lliura Esterlina' },
  { code: 'JPY', symbol: '¥', locale: 'ja-JP', name: 'Ien Japonès' },
  { code: 'MXN', symbol: '$', locale: 'es-MX', name: 'Peso Mexicà' },
];