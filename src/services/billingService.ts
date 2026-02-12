// src/services/billingService.ts

import { Expense, TripUser, Balance, Settlement, CategoryStat, MoneyCents, toCents } from '../types';
import { CATEGORIES, SPLIT_TYPES } from '../utils/constants'; // [FIX] Importem la font de veritat

// [FIX] Eliminada constant SPLIT_TYPES duplicada per evitar conflictes.

export const SPECIAL_CATEGORIES = {
  TRANSFER: 'transfer',
  OTHER: 'other',
} as const;

// Llindar mínim per a transaccions
const MIN_SETTLEMENT_CENTS = toCents(1);

// --- HELPERS BÀSICS ---

export const resolveUserId = (identifier: string, users: TripUser[]): string | undefined => {
  if (!identifier) return undefined;
  const userById = users.find(u => u.id === identifier);
  return userById?.id;
};

const createUserResolutionMap = (users: TripUser[]): Record<string, string> => {
  const map: Record<string, string> = {};
  users.forEach(u => {
    if (u.id) map[u.id] = u.id;
  });
  return map;
};

const getStableDistributionOffset = (seed: string | number | undefined, modulus: number): number => {
  if (!seed || modulus <= 1) return 0;
  const seedStr = seed.toString();
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
    hash |= 0; 
  }
  return Math.abs(hash) % modulus;
};

// --- ESTRATÈGIES DE REPARTIMENT (Refactoritzat SRP) ---

/**
 * Estratègia EQUAL: Divideix l'import equitativament entre els participants.
 * Gestiona els cèntims romanents de forma determinista.
 */
const applyEqualSplit = (
  exp: Expense, 
  payerId: string,
  balanceMap: Record<string, MoneyCents>,
  getCanonicalId: (id: string) => string | undefined,
  allUserIds: string[]
): MoneyCents => {
  const rawInvolved = (exp.involved && exp.involved.length > 0) ? exp.involved : allUserIds;
  
  const receiversIds = Array.from(new Set(
    rawInvolved
      .map(id => getCanonicalId(id))
      .filter((id): id is string => !!id && balanceMap[id] !== undefined)
  )).sort(); 

  const count = receiversIds.length;
  if (count === 0) return toCents(0);

  const baseAmount = toCents(Math.floor(exp.amount / count));
  const remainder = exp.amount % count; 
  const offset = getStableDistributionOffset(exp.id, count);

  receiversIds.forEach((uid, i) => {
    const rotatedIndex = (i - offset + count) % count;
    const paysExtraCent = rotatedIndex < remainder;
    const amountToPay = toCents(baseAmount + (paysExtraCent ? 1 : 0));
    
    balanceMap[uid] = toCents(balanceMap[uid] - amountToPay);
  });

  return exp.amount; // Tot l'import s'acredita al pagador
};

/**
 * Estratègia EXACT: Assigna quantitats específiques a cada usuari.
 * La diferència (si n'hi ha) s'assumeix com a cost propi del pagador.
 */
const applyExactSplit = (
  exp: Expense,
  payerId: string,
  balanceMap: Record<string, MoneyCents>,
  getCanonicalId: (id: string) => string | undefined
): MoneyCents => {
  const details = exp.splitDetails || {};
  let totalAllocated = toCents(0);

  Object.entries(details).forEach(([identifier, amount]) => {
    const uid = getCanonicalId(identifier);
    if (uid && balanceMap[uid] !== undefined) {
      balanceMap[uid] = toCents(balanceMap[uid] - amount);
      totalAllocated = toCents(totalAllocated + amount);
    }
  });

  // Assignació de la diferència al pagador (cost propi)
  const remainder = exp.amount - totalAllocated;
  if (remainder > 0 && balanceMap[payerId] !== undefined) {
    balanceMap[payerId] = toCents(balanceMap[payerId] - remainder);
  }

  return exp.amount;
};

/**
 * Estratègia SHARES: Repartiment ponderat per participacions.
 * Utilitza matemàtica entera segura per evitar errors de punt flotant.
 */
const applySharesSplit = (
  exp: Expense,
  balanceMap: Record<string, MoneyCents>,
  getCanonicalId: (id: string) => string | undefined
): MoneyCents => {
  const details = exp.splitDetails || {};
  
  const entries = Object.entries(details)
    .map(([key, shares]) => ({ uid: getCanonicalId(key), shares }))
    .filter((entry): entry is { uid: string, shares: number } => !!entry.uid && balanceMap[entry.uid] !== undefined)
    .sort((a, b) => a.uid.localeCompare(b.uid));

  const totalShares = entries.reduce((acc, curr) => acc + curr.shares, 0);

  if (totalShares <= 0) return toCents(0);

  let distributedSoFar = toCents(0);
  
  const allocations = entries.map(entry => {
    // Multiplicació primer per precisió
    const rawAmount = toCents(Math.floor((exp.amount * entry.shares) / totalShares));
    return { ...entry, amountToPay: rawAmount };
  });

  const totalAllocatedBase = allocations.reduce((acc, curr) => toCents(acc + curr.amountToPay), toCents(0));
  let remainder = exp.amount - totalAllocatedBase;

  const offset = getStableDistributionOffset(exp.id, allocations.length);
  let distributionIdx = offset % allocations.length;

  // Circuit Breaker per bucle infinit
  let iterations = 0;
  const MAX_ITERATIONS = allocations.length * 2 + remainder;

  while (remainder > 0 && allocations.length > 0 && iterations < MAX_ITERATIONS) {
      const alloc = allocations[distributionIdx];
      alloc.amountToPay = toCents(alloc.amountToPay + 1);
      remainder--;
      distributionIdx = (distributionIdx + 1) % allocations.length;
      iterations++;
  }

  allocations.forEach((alloc) => {
    balanceMap[alloc.uid] = toCents(balanceMap[alloc.uid] - alloc.amountToPay);
    distributedSoFar = toCents(distributedSoFar + alloc.amountToPay);
  });

  return distributedSoFar;
};

// --- FUNCIÓ PRINCIPAL ---

export const calculateBalances = (expenses: Expense[], users: TripUser[]): Balance[] => {
  const balanceMap: Record<string, MoneyCents> = {};
  users.forEach(u => balanceMap[u.id] = toCents(0));

  const idResolver = createUserResolutionMap(users);
  const getCanonicalId = (rawId: string): string | undefined => idResolver[rawId];
  const allUserIds = users.map(u => u.id);

  expenses.forEach(exp => {
    const payerId = getCanonicalId(exp.payer);
    if (!payerId) return;

    let amountCreditedToPayer = toCents(0);
    const splitType = exp.splitType || SPLIT_TYPES.EQUAL;

    switch (splitType) {
      case SPLIT_TYPES.EQUAL:
        amountCreditedToPayer = applyEqualSplit(exp, payerId, balanceMap, getCanonicalId, allUserIds);
        break;
      case SPLIT_TYPES.EXACT:
        amountCreditedToPayer = applyExactSplit(exp, payerId, balanceMap, getCanonicalId);
        break;
      case SPLIT_TYPES.SHARES:
        amountCreditedToPayer = applySharesSplit(exp, balanceMap, getCanonicalId);
        break;
      default:
        // Fallback segur a EQUAL si el tipus és desconegut
        amountCreditedToPayer = applyEqualSplit(exp, payerId, balanceMap, getCanonicalId, allUserIds);
        break;
    }

    if (balanceMap[payerId] !== undefined) {
      balanceMap[payerId] = toCents(balanceMap[payerId] + amountCreditedToPayer);
    }
  });

  return Object.entries(balanceMap)
    .map(([userId, amount]) => ({ userId, amount }))
    .sort((a, b) => b.amount - a.amount);
};

// --- ALTRES FUNCIONS ---

export const calculateSettlements = (balances: Balance[]): Settlement[] => {
  const totalBalance = balances.reduce((acc, b) => acc + b.amount, 0);
  
  if (totalBalance !== 0) {
    console.warn(`[Audit Warning] Balanços desquadrats (${totalBalance} cèntims).`);
  }

  const debts: Settlement[] = [];
  const workingBalances = balances.map(b => ({ ...b }));

  const debtors = workingBalances
    .filter(b => b.amount < 0) 
    .sort((a, b) => a.amount - b.amount);

  const creditors = workingBalances
    .filter(b => b.amount > 0) 
    .sort((a, b) => b.amount - a.amount);

  let i = 0; 
  let j = 0; 

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amount = toCents(Math.min(Math.abs(debtor.amount), creditor.amount));

    if (amount >= MIN_SETTLEMENT_CENTS) {
      debts.push({ 
        from: debtor.userId, 
        to: creditor.userId, 
        amount 
      });
    }

    debtor.amount = toCents(debtor.amount + amount);
    creditor.amount = toCents(creditor.amount - amount);

    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  return debts;
};

export const calculateCategoryStats = (expenses: Expense[]): CategoryStat[] => {
  const stats: Record<string, MoneyCents> = {};
  
  const validExpenses = expenses.filter(e => e.category !== SPECIAL_CATEGORIES.TRANSFER);
  const total = toCents(validExpenses.reduce((acc, curr) => acc + curr.amount, 0));

  if (total === 0) return [];

  validExpenses.forEach(exp => {
    const catKey = exp.category || SPECIAL_CATEGORIES.OTHER;
    const current = stats[catKey] || toCents(0);
    stats[catKey] = toCents(current + exp.amount);
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

export const calculateTotalSpending = (expenses: Expense[]): MoneyCents => {
  const total = expenses
    .filter(e => e.category !== SPECIAL_CATEGORIES.TRANSFER)
    .reduce((acc, curr) => acc + curr.amount, 0);
    
  return toCents(total);
};