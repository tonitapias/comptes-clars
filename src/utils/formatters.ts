// src/utils/formatters.ts

import { Currency } from '../types';

/**
 * Formata un import en cèntims a una cadena de moneda localitzada.
 * @param amount Import en cèntims (enter)
 * @param currency Objecte amb el codi i locale (ex: {code: 'EUR', locale: 'ca-ES'})
 */
export const formatMoney = (amount: number, currency: Currency): string => {
  // Gestió de valors no numèrics
  if (typeof amount !== 'number' || isNaN(amount)) return '0,00 €';

  try {
    return new Intl.NumberFormat(currency?.locale || 'ca-ES', { 
      style: 'currency', 
      currency: currency?.code || 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount / 100);
  } catch (error) {
    // Fallback simple si falla la localització
    return `${(amount / 100).toFixed(2)} ${currency?.symbol || ''}`;
  }
};

export const formatCurrency = formatMoney;

/**
 * Formata una data ISO a un format llegible (ex: 12 de maig).
 * @param dateString Data en format string (ISO)
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    // Validem si la data és vàlida
    if (isNaN(date.getTime())) return '';

    return date.toLocaleDateString('ca-ES', { 
      day: 'numeric', 
      month: 'short',
      // Opcional: any: 'numeric' si vols veure l'any
    });
  } catch (e) {
    return '';
  }
};

export const formatDateDisplay = formatDate;