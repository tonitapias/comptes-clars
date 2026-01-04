import { Currency } from '../types';

export const formatCurrency = (amount: number, currency: Currency) => {
  return new Intl.NumberFormat(currency?.locale || 'ca-ES', { 
    style: 'currency', 
    currency: currency?.code || 'EUR' 
  }).format(amount / 100);
};

export const formatDateDisplay = (d: string) => {
  return d ? new Date(d).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' }) : '';
};