// src/utils/formatters.ts

import { Currency, MoneyCents, toCents } from '../types';

// [MILLORA FASE 1]: Sistema de cache per a les instàncies de format.
// Instanciar Intl.NumberFormat és una operació costosa en JS.
// Amb aquesta cache, una llista de 1000 despeses farà servir la mateixa instància en lloc de crear-ne 1000 noves.
const formattersCache = new Map<string, Intl.NumberFormat>();

const getFormatter = (locale: string, currencyCode: string): Intl.NumberFormat => {
  const cacheKey = `${locale}-${currencyCode}`;
  
  if (!formattersCache.has(cacheKey)) {
    formattersCache.set(
      cacheKey, 
      new Intl.NumberFormat(locale, { 
        style: 'currency', 
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    );
  }
  
  return formattersCache.get(cacheKey)!;
};

/**
 * Formata un import en cèntims a una cadena de moneda localitzada.
 * BLINDATGE: Gestió robusta d'errors de 'Intl' i valors nuls, compatible amb MoneyCents.
 */
export const formatMoney = (amount: MoneyCents | null | undefined, currency: Currency | undefined): string => {
  // 1. Sanitització d'entrada: Si no hi ha import, mostrem 0.
  if (amount === null || amount === undefined || isNaN(amount)) {
    if (amount !== toCents(0)) {
      return formatMoney(toCents(0), currency);
    }
  }

  // 2. Valors per defecte segurs (Safe Defaults)
  const safeCode = currency?.code || 'EUR';
  const safeLocale = currency?.locale || 'ca-ES';
  const safeSymbol = currency?.symbol || '€';

  // Convertim cèntims a unitats per a la visualització (float).
  const valueInUnits = (amount || 0) / 100;

  try {
    // Utilitzem l'API nativa cachejada
    const formatter = getFormatter(safeLocale, safeCode);
    return formatter.format(valueInUnits);
  } catch (error) {
    // 3. Fallback d'últim recurs (Fail-safe)
    console.warn(`Error formatting currency (${safeCode}/${safeLocale}):`, error);
    return `${valueInUnits.toFixed(2)} ${safeSymbol}`;
  }
};

// Mantenim l'àlies per compatibilitat
export const formatCurrency = formatMoney;

/**
 * Formata una data ISO.
 * Sense canvis respecte a l'original, excepte l'optimització d'instanciació innecessària de Date si ja falla.
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