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
// Reduït a 1 cèntim per garantir que el grup pugui quedar a zero absolut (Risc Zero: Integritat).
const MIN_SETTLEMENT_CENTS = 1; 

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
 * Lògica refactoritzada per garantir SUMA ZERO en tots els casos.
 */
export const calculateBalances = (expenses: Expense[], users: TripUser[]): Balance[] => {
  const balanceMap: Record<string, number> = {};
  users.forEach(u => balanceMap[u.id] = 0);

  const idResolver = createUserResolutionMap(users);
  const getCanonicalId = (rawId: string): string | undefined => idResolver[rawId];

  expenses.forEach(exp => {
    const payerId = getCanonicalId(exp.payer);
    if (!payerId) return;

    // VARIABLE CLAU: Calculem quant s'ha de retornar realment al pagador
    // per garantir que (Abonament Pagador) == (Suma Deutes).
    let amountCreditedToPayer = 0;

    const splitType = exp.splitType || SPLIT_TYPES.EQUAL;

    if (splitType === SPLIT_TYPES.EQUAL) {
      // MODE EQUITATIU
      // Reparteix l'import total entre els participants
      const rawInvolved = (exp.involved && exp.involved.length > 0) ? exp.involved : users.map(u => u.id);
      
      const receiversIds = Array.from(new Set(
        rawInvolved
          .map(id => getCanonicalId(id))
          .filter((id): id is string => !!id && balanceMap[id] !== undefined)
      )).sort(); 

      const count = receiversIds.length;
      if (count > 0) {
        // Quantitat base (divisió entera)
        const baseAmount = Math.floor(exp.amount / count);
        // Residu a repartir (cèntims solts)
        const remainder = exp.amount % count;

        receiversIds.forEach((uid, index) => {
          // Els primers 'remainder' usuaris paguen 1 cèntim més
          const amountToPay = baseAmount + (index < remainder ? 1 : 0);
          balanceMap[uid] -= amountToPay;
        });

        // En mode EQUAL, sempre repartim tot l'import original
        amountCreditedToPayer = exp.amount;
      }

    } else if (splitType === SPLIT_TYPES.EXACT) {
      // MODE EXACTE
      // CORRECCIÓ CRÍTICA: L'import abonat al pagador ha de ser la suma dels detalls,
      // no l'import teòric de la despesa, per evitar crear/destruir diners.
      const details = exp.splitDetails || {};
      let totalAllocated = 0;

      Object.entries(details).forEach(([identifier, amount]) => {
        const uid = getCanonicalId(identifier);
        if (uid && balanceMap[uid] !== undefined) {
          balanceMap[uid] -= amount;
          totalAllocated += amount;
        }
      });

      amountCreditedToPayer = totalAllocated;

    } else if (splitType === SPLIT_TYPES.SHARES) {
      // MODE PARTS (SHARES)
      const details = exp.splitDetails || {};
      
      const entries = Object.entries(details)
        .map(([key, shares]) => ({ uid: getCanonicalId(key), shares }))
        .filter((entry): entry is { uid: string, shares: number } => !!entry.uid && balanceMap[entry.uid] !== undefined)
        // Ordenem per ID consistentment per a que el repartiment de residus sigui determinista
        .sort((a, b) => a.uid.localeCompare(b.uid));

      const totalShares = entries.reduce((acc, curr) => acc + curr.shares, 0);

      if (totalShares > 0) {
        const amountPerShare = exp.amount / totalShares;
        let distributedSoFar = 0;
        
        // 1. Assignació base (arrodonint cap avall)
        const allocations = entries.map(entry => {
          const rawAmount = Math.floor(entry.shares * amountPerShare);
          return { ...entry, amountToPay: rawAmount };
        });

        const totalAllocatedBase = allocations.reduce((acc, curr) => acc + curr.amountToPay, 0);
        
        // 2. Repartiment just del residu (cèntims)
        let remainder = exp.amount - totalAllocatedBase;

        // Repartim 1 cèntim als primers N usuaris fins esgotar el residu
        allocations.forEach((alloc) => {
          if (remainder > 0) {
            alloc.amountToPay += 1;
            remainder -= 1;
          }
          balanceMap[alloc.uid] -= alloc.amountToPay;
          distributedSoFar += alloc.amountToPay;
        });

        // En mode SHARES, assumim que l'objectiu és repartir tot l'import
        amountCreditedToPayer = distributedSoFar; 
      }
    }

    // FINALMENT: Abonem al pagador la quantitat exacta que s'ha carregat als altres
    if (balanceMap[payerId] !== undefined) {
      balanceMap[payerId] += amountCreditedToPayer;
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
  // Treballem amb una còpia per no mutar l'entrada
  const workingBalances = balances.map(b => ({ ...b }));

  // Separem deutors (negatiu) i creditors (positiu)
  const debtors = workingBalances
    .filter(b => b.amount < -0.9) // Filtratge suau per evitar soroll de float molt petit
    .sort((a, b) => a.amount - b.amount); // Més deutor primer (-100, -50...)

  const creditors = workingBalances
    .filter(b => b.amount > 0.9) 
    .sort((a, b) => b.amount - a.amount); // Més creditor primer (100, 50...)

  let i = 0; 
  let j = 0; 

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    // L'import a saldar és el mínim entre el que deu un i el que espera l'altre
    const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

    // Només generem la transacció si supera el mínim (ara 1 cèntim)
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

    // Avancem índexs si s'han saldat (amb un marge d'error mínim per flotants)
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