import { Currency } from '../types';

// Funció principal de formatar diners
export const formatMoney = (amount: number, currency: Currency) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00';
  
  return new Intl.NumberFormat(currency?.locale || 'ca-ES', { 
    style: 'currency', 
    currency: currency?.code || 'EUR' 
  }).format(amount / 100);
};

// Alias: permet que els components que busquen 'formatCurrency' també funcionin
export const formatCurrency = formatMoney;

// Formatador de dates curt (ex: "12 gen.")
export const formatDate = (d: string) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' });
  } catch (e) {
    return '';
  }
};

// Alias: permet que ExpensesList trobi 'formatDateDisplay'
export const formatDateDisplay = formatDate;