// src/utils/formatters.ts

import { Currency, MoneyCents, toCents } from '../types';

/**
 * Formata un import en cèntims a una cadena de moneda localitzada.
 * BLINDATGE: Gestió robusta d'errors de 'Intl' i valors nuls, compatible amb MoneyCents.
 */
export const formatMoney = (amount: MoneyCents | null | undefined, currency: Currency | undefined): string => {
  // 1. Sanitització d'entrada: Si no hi ha import, mostrem 0.
  // Nota: isNaN funciona amb MoneyCents perquè en runtime és un number.
  if (amount === null || amount === undefined || isNaN(amount)) {
    // Evitem recursió infinita passant 0 explícitament.
    // FIX CRÍTIC: Utilitzem toCents(0) perquè TypeScript accepti el '0' com a diner vàlid.
    // També comprovem si ja és 0 per evitar bucle infinit si el 0 falla (molt improbable).
    if (amount !== toCents(0)) {
      return formatMoney(toCents(0), currency);
    }
  }

  // 2. Valors per defecte segurs (Safe Defaults)
  const safeCode = currency?.code || 'EUR';
  const safeLocale = currency?.locale || 'ca-ES';
  const safeSymbol = currency?.symbol || '€';

  // Convertim cèntims a unitats per a la visualització (float).
  // En dividir per 100, TypeScript automàticament "treu la marca" i ho tracta com number,
  // que és exactament el que vol Intl.NumberFormat.
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
    console.warn(`Error formatting currency (${safeCode}/${safeLocale}):`, error);
    return `${valueInUnits.toFixed(2)} ${safeSymbol}`;
  }
};

// Mantenim l'àlies per compatibilitat
export const formatCurrency = formatMoney;

/**
 * Formata una data ISO.
 * Sense canvis respecte a l'original.
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