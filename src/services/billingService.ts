// src/services/billingService.ts

import { Expense, TripUser, Balance, Settlement, CategoryStat } from '../types';
import { CATEGORIES } from '../utils/constants';

// CONSTANTS INTERNES PER A EVITAR "MAGIC STRINGS"
const SPLIT_TYPES = {
  EQUAL: 'equal',
  EXACT: 'exact',
  SHARES: 'shares',
} as const;

const SPECIAL_CATEGORIES = {
  TRANSFER: 'transfer',
  OTHER: 'other',
} as const;

// Llindar mínim per suggerir una devolució (en cèntims). 
// Evita transaccions ridícules com tornar 0.01€.
const MIN_SETTLEMENT_CENTS = 10; 

/**
 * Normalitza la identificació d'usuaris.
 * Prioritza ID i usa nom només per compatibilitat legacy.
 * Aquesta funció es manté exportada per si es fa servir a la UI, 
 * però internament utilitzarem un mapa optimitzat.
 */
export const resolveUserId = (identifier: string, users: TripUser[]): string | undefined => {
  if (!identifier) return undefined;
  
  // Optimització: cerca directa primer
  const userById = users.find(u => u.id === identifier);
  if (userById) return userById.id;

  // Fallback: cerca per nom (Legacy support)
  const userByName = users.find(u => u.name === identifier);
  if (userByName) return userByName.id;

  return undefined;
};

/**
 * Helper: Crea un mapa de resolució ràpida (Cache) per normalitzar IDs.
 * Retorna un objecte on la clau pot ser un ID o un Nom, i el valor és sempre l'ID Canònic.
 */
const createUserResolutionMap = (users: TripUser[]): Record<string, string> => {
  const map: Record<string, string> = {};
  
  users.forEach(u => {
    // Prioritat 1: L'ID apunta a l'ID
    map[u.id] = u.id;
    // Prioritat 2: El nom apunta a l'ID (per compatibilitat amb dades antigues)
    // Nota: Si un nom coincideix amb un ID d'un altre usuari, l'ID guanya per l'ordre d'assignació anterior o lògica de negoci.
    if (u.name) {
      map[u.name] = u.id;
    }
  });
  
  return map;
};

/**
 * Calcula el balanç financer de cada usuari.
 * Lògica refactoritzada per a O(n) amb mapes de cerca.
 */
export const calculateBalances = (expenses: Expense[], users: TripUser[]): Balance[] => {
  // Inicialitzem balanços a 0
  const balanceMap: Record<string, number> = {};
  users.forEach(u => balanceMap[u.id] = 0);

  // Mapa de resolució ràpida (Identificador -> ID Canònic)
  const idResolver = createUserResolutionMap(users);

  // Helper local per obtenir ID canònic segur
  const getCanonicalId = (rawId: string): string | undefined => idResolver[rawId];

  expenses.forEach(exp => {
    // Ignorem despeses sense pagador vàlid
    const payerId = getCanonicalId(exp.payer);
    if (!payerId) return;

    // 1. Abonem l'import al pagador (Creditor)
    if (balanceMap[payerId] !== undefined) {
      balanceMap[payerId] += exp.amount;
    }

    // 2. Carreguem el deute als involucrats (Deutors)
    const splitType = exp.splitType || SPLIT_TYPES.EQUAL;

    if (splitType === SPLIT_TYPES.EQUAL) {
      // Si no hi ha 'involved' explícit, assumim tots els usuaris
      const rawInvolved = (exp.involved && exp.involved.length > 0) ? exp.involved : users.map(u => u.id);
      
      // Resolem i filtrem IDs vàlids únics
      const receiversIds = Array.from(new Set(
        rawInvolved
          .map(id => getCanonicalId(id))
          .filter((id): id is string => !!id && balanceMap[id] !== undefined)
      )).sort(); // L'ordenació garanteix determinisme en el repartiment del residu

      const count = receiversIds.length;
      if (count > 0) {
        const baseAmount = Math.floor(exp.amount / count);
        const remainder = exp.amount % count;

        receiversIds.forEach((uid, index) => {
          // Repartiment just del cèntim sobrant (residu) als primers de la llista ordenada
          const amountToPay = baseAmount + (index < remainder ? 1 : 0);
          balanceMap[uid] -= amountToPay;
        });
      }

    } else if (splitType === SPLIT_TYPES.EXACT) {
      const details = exp.splitDetails || {};
      Object.entries(details).forEach(([identifier, amount]) => {
        const uid = getCanonicalId(identifier);
        if (uid && balanceMap[uid] !== undefined) {
          balanceMap[uid] -= amount;
        }
      });

    } else if (splitType === SPLIT_TYPES.SHARES) {
      const details = exp.splitDetails || {};
      
      // Preparem entrades vàlides amb IDs canònics
      const entries = Object.entries(details)
        .map(([key, shares]) => ({ uid: getCanonicalId(key), shares }))
        .filter((entry): entry is { uid: string, shares: number } => !!entry.uid && balanceMap[entry.uid] !== undefined)
        .sort((a, b) => a.uid.localeCompare(b.uid)); // Ordenació per determinisme

      const totalShares = entries.reduce((acc, curr) => acc + curr.shares, 0);

      if (totalShares > 0) {
        const amountPerShare = exp.amount / totalShares;
        let distributed = 0;
        const count = entries.length;

        entries.forEach((entry, index) => {
          let amountToPay;
          if (index === count - 1) {
            // L'últim paga la diferència per assegurar que suma exactament l'import total
            amountToPay = exp.amount - distributed;
          } else {
            amountToPay = Math.floor(entry.shares * amountPerShare);
          }
          balanceMap[entry.uid] -= amountToPay;
          distributed += amountToPay;
        });
      }
    }
  });

  // Retornem array ordenat (els que han pagat més primer)
  return Object.entries(balanceMap)
    .map(([userId, amount]) => ({ userId, amount }))
    .sort((a, b) => b.amount - a.amount);
};

/**
 * Algoritme per minimitzar transaccions (Greedy).
 * Optimitzat per ignorar micro-deutes (soroll).
 */
export const calculateSettlements = (balances: Balance[]): Settlement[] => {
  const debts: Settlement[] = [];
  
  // Creem còpia per no mutar l'entrada
  const workingBalances = balances.map(b => ({ ...b }));

  // Separem deutors (negatiu) i creditors (positiu)
  // Filtrem imports irrellevants per evitar bucles innecessaris
  const debtors = workingBalances
    .filter(b => b.amount < -1) 
    .sort((a, b) => a.amount - b.amount); // De més deute a menys

  const creditors = workingBalances
    .filter(b => b.amount > 1) 
    .sort((a, b) => b.amount - a.amount); // De més crèdit a menys

  let i = 0; // Punter deutors
  let j = 0; // Punter creditors

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    // L'import a liquidar és el mínim entre el que un deu i l'altre ha de cobrar
    // Math.abs() perquè el deute és negatiu
    const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

    // Només generem la proposta si supera el llindar mínim (ex: 10 cèntims)
    if (amount >= MIN_SETTLEMENT_CENTS) {
      debts.push({ 
        from: debtor.userId, 
        to: creditor.userId, 
        amount 
      });
    }

    // Ajustem els balanços temporals
    debtor.amount += amount;
    creditor.amount -= amount;

    // Avancem punters si s'ha liquidat totalment (o queda un residu menyspreable)
    if (Math.abs(debtor.amount) < 1) i++;
    if (creditor.amount < 1) j++;
  }

  return debts;
};

/**
 * Estadístiques per categoria.
 */
export const calculateCategoryStats = (expenses: Expense[]): CategoryStat[] => {
  const stats: Record<string, number> = {};
  
  // Filtrem transferències internes (no són despesa real del grup)
  const validExpenses = expenses.filter(e => e.category !== SPECIAL_CATEGORIES.TRANSFER);
  const total = validExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  if (total === 0) return [];

  validExpenses.forEach(exp => {
    // Si no té categoria, l'assignem a 'other'
    const catKey = exp.category || SPECIAL_CATEGORIES.OTHER;
    stats[catKey] = (stats[catKey] || 0) + exp.amount;
  });

  return Object.entries(stats).map(([id, amount]) => {
    // Busquem la info visual de la categoria (icona, color, etc.)
    const catInfo = CATEGORIES.find(c => c.id === id) || 
                   CATEGORIES.find(c => c.id === SPECIAL_CATEGORIES.OTHER) || 
                   CATEGORIES[0];
    
    return {
      ...catInfo,
      amount,
      percentage: (amount / total) * 100
    };
  }).sort((a, b) => b.amount - a.amount);
};

export const calculateTotalSpending = (expenses: Expense[]): number => {
  return expenses
    .filter(e => e.category !== SPECIAL_CATEGORIES.TRANSFER)
    .reduce((acc, curr) => acc + curr.amount, 0);
};