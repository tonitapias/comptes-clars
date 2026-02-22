// src/config/businessRules.ts

/**
 * Regles de negoci globals de l'aplicació Comptes Clars.
 * Centralitzem els valors per evitar "Magic Numbers" escampats pel codi.
 */
export const BUSINESS_RULES = {
  // Marge màxim en cèntims que un usuari pot deure/tenir a favor per poder abandonar un viatge
  MAX_LEAVE_BALANCE_MARGIN: 1,
  
  // Marge màxim (estricte) en cèntims per considerar que un projecte sencer està saldat
  // Un valor < 2 vol dir que permetem desajustos màxims d'1 cèntim (pels arrodoniments al dividir)
  SETTLED_TOLERANCE_MARGIN: 2,
} as const;