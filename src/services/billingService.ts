// src/services/billingService.ts

import { Expense, TripUser, Balance, Settlement, CategoryStat } from '../types';
import { CATEGORIES } from '../utils/constants';

// CONSTANTS
export const SPLIT_TYPES = {
  EQUAL: 'equal',
  EXACT: 'exact',
  SHARES: 'shares',
} as const;

export const SPECIAL_CATEGORIES = {
  TRANSFER: 'transfer',
  OTHER: 'other',
} as const;

// Llindar mínim per a transaccions (1 cèntim)
const MIN_SETTLEMENT_CENTS = 1;

/**
 * Normalitza la identificació d'usuaris.
 * REFACTORITZAT: Eliminat el fallback per nom per garantir integritat referencial.
 * Ara només resol si l'identificador coincideix exactament amb un ID d'usuari existent.
 */
export const resolveUserId = (identifier: string, users: TripUser[]): string | undefined => {
  if (!identifier) return undefined;
  
  // Cerca estricta per ID (O(n) - es podria optimitzar amb un Map si es crida molt, 
  // però per a llistes d'usuaris petites (<50) és insignificant).
  const userById = users.find(u => u.id === identifier);
  return userById?.id;
};

/**
 * Helper: Crea un mapa de resolució estricta (ID -> ID).
 * REFACTORITZAT: S'ha eliminat la indexació per 'name' per evitar col·lisions 
 * i suplantacions d'identitat en el càlcul de balanços.
 */
const createUserResolutionMap = (users: TripUser[]): Record<string, string> => {
  const map: Record<string, string> = {};
  users.forEach(u => {
    if (u.id) {
      map[u.id] = u.id;
    }
  });
  return map;
};

/**
 * Calcula el balanç financer de cada usuari.
 * Lògica de Suma Zero garantida.
 */
export const calculateBalances = (expenses: Expense[], users: TripUser[]): Balance[] => {
  const balanceMap: Record<string, number> = {};
  
  // Inicialitzem tots els usuaris a 0
  users.forEach(u => balanceMap[u.id] = 0);

  // Mapa de resolució estricta
  const idResolver = createUserResolutionMap(users);
  const getCanonicalId = (rawId: string): string | undefined => idResolver[rawId];

  expenses.forEach(exp => {
    // Si el pagador no és un ID vàlid del grup actual, ignorem la despesa (Seguretat per defecte)
    const payerId = getCanonicalId(exp.payer);
    if (!payerId) return;

    let amountCreditedToPayer = 0;
    const splitType = exp.splitType || SPLIT_TYPES.EQUAL;

    // --- MODE EQUITATIU (EQUAL) ---
    if (splitType === SPLIT_TYPES.EQUAL) {
      const rawInvolved = (exp.involved && exp.involved.length > 0) ? exp.involved : users.map(u => u.id);
      
      // Filtrem IDs vàlids i únics
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
          // Repartiment determinista del residu
          const amountToPay = baseAmount + (index < remainder ? 1 : 0);
          balanceMap[uid] -= amountToPay;
        });

        // En mode EQUAL, el pagador rep l'import total ja que s'ha repartit tot íntegrament
        amountCreditedToPayer = exp.amount;
      }

    // --- MODE EXACTE (EXACT) ---
    } else if (splitType === SPLIT_TYPES.EXACT) {
      const details = exp.splitDetails || {};
      let totalAllocated = 0;

      Object.entries(details).forEach(([identifier, amount]) => {
        const uid = getCanonicalId(identifier);
        if (uid && balanceMap[uid] !== undefined) {
          balanceMap[uid] -= amount;
          totalAllocated += amount;
        }
      });
      // El pagador només rep la suma del que s'ha pogut assignar a usuaris vàlids
      amountCreditedToPayer = totalAllocated;

    // --- MODE PARTICIPACIONS (SHARES) ---
    } else if (splitType === SPLIT_TYPES.SHARES) {
      const details = exp.splitDetails || {};
      
      const entries = Object.entries(details)
        .map(([key, shares]) => ({ uid: getCanonicalId(key), shares }))
        .filter((entry): entry is { uid: string, shares: number } => !!entry.uid && balanceMap[entry.uid] !== undefined)
        .sort((a, b) => a.uid.localeCompare(b.uid));

      const totalShares = entries.reduce((acc, curr) => acc + curr.shares, 0);

      if (totalShares > 0) {
        const amountPerShare = exp.amount / totalShares;
        let distributedSoFar = 0;
        
        // 1. Assignació base
        const allocations = entries.map(entry => {
          const rawAmount = Math.floor(entry.shares * amountPerShare);
          return { ...entry, amountToPay: rawAmount };
        });

        const totalAllocatedBase = allocations.reduce((acc, curr) => acc + curr.amountToPay, 0);
        
        // 2. Repartiment del residu
        let remainder = exp.amount - totalAllocatedBase;

        allocations.forEach((alloc) => {
          if (remainder > 0) {
            alloc.amountToPay += 1;
            remainder -= 1;
          }
          balanceMap[alloc.uid] -= alloc.amountToPay;
          distributedSoFar += alloc.amountToPay;
        });

        amountCreditedToPayer = distributedSoFar; 
      }
    }

    // Abonament final al pagador
    if (balanceMap[payerId] !== undefined) {
      balanceMap[payerId] += amountCreditedToPayer;
    }
  });

  return Object.entries(balanceMap)
    .map(([userId, amount]) => ({ userId, amount }))
    .sort((a, b) => b.amount - a.amount);
};

/**
 * Algoritme per minimitzar transaccions (Mantenim lògica existent per ara).
 * TODO: En una futura iteració es pot optimitzar l'algorisme Greedy per reduir passos intermedis,
 * però ara prioritzem l'estabilitat del canvi d'IDs.
 */
export const calculateSettlements = (balances: Balance[]): Settlement[] => {
  const debts: Settlement[] = [];
  const workingBalances = balances.map(b => ({ ...b }));

  const debtors = workingBalances
    .filter(b => b.amount < -0.9) 
    .sort((a, b) => a.amount - b.amount);

  const creditors = workingBalances
    .filter(b => b.amount > 0.9) 
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

// --- FUNCIONS AUXILIARS DE CÀLCUL (Sense canvis estructurals) ---

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
    // Safe lookup per a categories eliminades o custom
    const catInfo = CATEGORIES.find(c => c.id === id) || 
                   CATEGORIES.find(c => c.id === SPECIAL_CATEGORIES.OTHER) || 
                   CATEGORIES[0]; // Fallback final
    
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