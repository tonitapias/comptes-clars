// src/config/businessRules.ts

/**
 * Regles de negoci globals de l'aplicació Comptes Clars.
 * Centralitzem els valors per evitar "Magic Numbers" escampats pel codi.
 */
export const BUSINESS_RULES = {
  // Marge màxim en cèntims que un usuari pot deure/tenir a favor per poder abandonar un viatge
  MAX_LEAVE_BALANCE_MARGIN: 1,
} as const;