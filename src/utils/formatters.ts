// src/utils/formatters.ts

import { Currency, MoneyCents } from '../types';

/**
 * Formata un import en cèntims a una cadena de moneda localitzada.
 * BLINDATGE: Gestió robusta d'errors de 'Intl' i valors nuls.
 */
export const formatMoney = (amount: MoneyCents | null | undefined, currency: Currency | undefined): string => {
  // 1. Sanitització d'entrada: Si no hi ha import, mostrem 0.
  if (amount === null || amount === undefined || isNaN(amount)) {
    // Evitem recursió infinita passant 0 explícitament
    if (amount !== 0) return formatMoney(0, currency);
  }

  // 2. Valors per defecte segurs (Safe Defaults)
  // Això evita errors "Cannot read property of undefined" dins del try/catch
  const safeCode = currency?.code || 'EUR';
  const safeLocale = currency?.locale || 'ca-ES';
  const safeSymbol = currency?.symbol || '€';

  // Convertim cèntims a unitats per a la visualització
  const valueInUnits = (amount || 0) / 100;

  try {
    // Intentem utilitzar l'API nativa del navegador
    return new Intl.NumberFormat(safeLocale, { 
      style: 'currency', 
      currency: safeCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valueInUnits);
  } catch (error) {
    // 3. Fallback d'últim recurs (Fail-safe)
    // Si el navegador no suporta el locale o el codi de moneda, mostrem string manual
    console.warn(`Error formatting currency (${safeCode}/${safeLocale}):`, error);
    return `${valueInUnits.toFixed(2)} ${safeSymbol}`;
  }
};

// Mantenim l'àlies per compatibilitat
export const formatCurrency = formatMoney;

/**
 * Formata una data ISO.
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    return date.toLocaleDateString('ca-ES', { 
      day: 'numeric', 
      month: 'short'
    });
  } catch (e) {
    return '';
  }
};

export const formatDateDisplay = formatDate;