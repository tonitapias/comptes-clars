import { Currency } from '../types';

// Funció principal de formatar diners
export const formatMoney = (amount: number, currency: Currency) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00';
  
  // TORNEM A DIVIDIR PER 100 (Estàndard de Cèntims)
  return new Intl.NumberFormat(currency?.locale || 'ca-ES', { 
    style: 'currency', 
    currency: currency?.code || 'EUR' 
  }).format(amount / 100);
};

export const formatCurrency = formatMoney;

export const formatDate = (d: string) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' });
  } catch (e) {
    return '';
  }
};

export const formatDateDisplay = formatDate;