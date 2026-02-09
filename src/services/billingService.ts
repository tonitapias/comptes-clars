// src/services/billingService.ts

import { Expense, TripUser, Balance, Settlement, CategoryStat } from '../types';
import { CATEGORIES } from '../utils/constants';

// MILLORA: Exportem constants per a ús compartit (DRY)
export const SPLIT_TYPES = {
  EQUAL: 'equal',
  EXACT: 'exact',
  SHARES: 'shares',
} as const;

export const SPECIAL_CATEGORIES = {
  TRANSFER: 'transfer',
  OTHER: 'other',
} as const;

// Llindar mínim per suggerir una devolució (en cèntims). 
// Evita transaccions ridícules com tornar 0.01€.
const MIN_SETTLEMENT_CENTS = 10; 

/**
 * Normalitza la identificació d'usuaris.
 * Prioritza ID i usa nom només per compatibilitat legacy.
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
 */
const createUserResolutionMap = (users: TripUser[]): Record<string, string> => {
  const map: Record<string, string> = {};
  users.forEach(u => {
    map[u.id] = u.id;
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
  const balanceMap: Record<string, number> = {};
  users.forEach(u => balanceMap[u.id] = 0);

  const idResolver = createUserResolutionMap(users);
  const getCanonicalId = (rawId: string): string | undefined => idResolver[rawId];

  expenses.forEach(exp => {
    const payerId = getCanonicalId(exp.payer);
    if (!payerId) return;

    // 1. Abonem l'import al pagador
    if (balanceMap[payerId] !== undefined) {
      balanceMap[payerId] += exp.amount;
    }

    // 2. Carreguem el deute als involucrats
    const splitType = exp.splitType || SPLIT_TYPES.EQUAL;

    if (splitType === SPLIT_TYPES.EQUAL) {
      const rawInvolved = (exp.involved && exp.involved.length > 0) ? exp.involved : users.map(u => u.id);
      
      const receiversIds = Array.from(new Set(
        rawInvolved
          .map(id => getCanonicalId(id))
          .filter((id): id is string => !!id && balanceMap[id] !== undefined)
      )).sort(); 

      const count = receiversIds.length;
      if (count > 0) {
        const baseAmount = Math.floor(exp.amount / count);
        const remainder = exp.amount % count;

        receiversIds.forEach((uid, index) => {
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
      
      const entries = Object.entries(details)
        .map(([key, shares]) => ({ uid: getCanonicalId(key), shares }))
        .filter((entry): entry is { uid: string, shares: number } => !!entry.uid && balanceMap[entry.uid] !== undefined)
        .sort((a, b) => a.uid.localeCompare(b.uid));

      const totalShares = entries.reduce((acc, curr) => acc + curr.shares, 0);

      if (totalShares > 0) {
        const amountPerShare = exp.amount / totalShares;
        let distributed = 0;
        const count = entries.length;

        entries.forEach((entry, index) => {
          let amountToPay;
          if (index === count - 1) {
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

  return Object.entries(balanceMap)
    .map(([userId, amount]) => ({ userId, amount }))
    .sort((a, b) => b.amount - a.amount);
};

/**
 * Algoritme per minimitzar transaccions (Greedy).
 */
export const calculateSettlements = (balances: Balance[]): Settlement[] => {
  const debts: Settlement[] = [];
  const workingBalances = balances.map(b => ({ ...b }));

  const debtors = workingBalances
    .filter(b => b.amount < -1) 
    .sort((a, b) => a.amount - b.amount);

  const creditors = workingBalances
    .filter(b => b.amount > 1) 
    .sort((a, b) => b.amount - a.amount);

  let i = 0; 
  let j = 0; 

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

    if (amount >= MIN_SETTLEMENT_CENTS) {
      debts.push({ 
        from: debtor.userId, 
        to: creditor.userId, 
        amount 
      });
    }

    debtor.amount += amount;
    creditor.amount -= amount;

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
  
  const validExpenses = expenses.filter(e => e.category !== SPECIAL_CATEGORIES.TRANSFER);
  const total = validExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  if (total === 0) return [];

  validExpenses.forEach(exp => {
    const catKey = exp.category || SPECIAL_CATEGORIES.OTHER;
    stats[catKey] = (stats[catKey] || 0) + exp.amount;
  });

  return Object.entries(stats).map(([id, amount]) => {
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