import { 
  Utensils, Car, Home, Beer, Plane, ShoppingBag, 
  Music, Banknote, HelpCircle, Ticket, Filter 
} from 'lucide-react';
import { Category, Currency } from '../types';

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
  { code: 'EUR', symbol: '€', locale: 'ca-ES' },
  { code: 'USD', symbol: '$', locale: 'en-US' },
  { code: 'GBP', symbol: '£', locale: 'en-GB' },
  { code: 'JPY', symbol: '¥', locale: 'ja-JP' },
  { code: 'MXN', symbol: '$', locale: 'es-MX' },
];