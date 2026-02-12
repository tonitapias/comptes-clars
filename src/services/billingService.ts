// src/services/billingService.ts

import { Expense, TripUser, Balance, Settlement, CategoryStat, MoneyCents, toCents } from '../types';
import { CATEGORIES, SPLIT_TYPES } from '../utils/constants';

export const SPECIAL_CATEGORIES = {
  TRANSFER: 'transfer',
  OTHER: 'other',
} as const;

// Llindar mínim per a transaccions
const MIN_SETTLEMENT_CENTS = toCents(1);

// --- TIPUS INTERNS PER A REPARTIMENT (Pure Functions) ---
interface SplitResult {
  allocations: Record<string, MoneyCents>; // Mapa de càrrecs (valors negatius)
}

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

// --- ESTRATÈGIES DE REPARTIMENT (Refactoritzat a Funcions Pures) ---

/**
 * Estratègia EQUAL: Divideix l'import equitativament.
 * NO modifica l'estat, retorna les assignacions.
 */
const calculateEqualSplit = (
  exp: Expense, 
  validUserIds: Set<string>, // Passem un Set per cerca ràpida O(1)
  getCanonicalId: (id: string) => string | undefined,
  allUserIds: string[]
): SplitResult => {
  const allocations: Record<string, MoneyCents> = {};
  
  const rawInvolved = (exp.involved && exp.involved.length > 0) ? exp.involved : allUserIds;
  
  // Normalitzem i filtrem usuaris vàlids
  const receiversIds = Array.from(new Set(
    rawInvolved
      .map(id => getCanonicalId(id))
      .filter((id): id is string => !!id && validUserIds.has(id))
  )).sort(); 

  const count = receiversIds.length;
  if (count === 0) return { allocations };

  const baseAmount = toCents(Math.floor(exp.amount / count));
  const remainder = exp.amount % count; 
  const offset = getStableDistributionOffset(exp.id, count);

  receiversIds.forEach((uid, i) => {
    const rotatedIndex = (i - offset + count) % count;
    const paysExtraCent = rotatedIndex < remainder;
    const amountToPay = toCents(baseAmount + (paysExtraCent ? 1 : 0));
    
    // Assignem DEUTE (negatiu)
    allocations[uid] = toCents(-amountToPay);
  });

  return { allocations };
};

/**
 * Estratègia EXACT: Assigna quantitats específiques.
 * La diferència s'imputa al pagador com a despesa pròpia.
 */
const calculateExactSplit = (
  exp: Expense,
  payerId: string,
  validUserIds: Set<string>,
  getCanonicalId: (id: string) => string | undefined
): SplitResult => {
  const allocations: Record<string, MoneyCents> = {};
  const details = exp.splitDetails || {};
  let totalAllocated = toCents(0);

  Object.entries(details).forEach(([identifier, amount]) => {
    const uid = getCanonicalId(identifier);
    if (uid && validUserIds.has(uid)) {
      // Deute directe de l'usuari
      allocations[uid] = toCents((allocations[uid] || 0) - amount);
      totalAllocated = toCents(totalAllocated + amount);
    }
  });

  // Assignació de la diferència al pagador (cost propi)
  const remainder = exp.amount - totalAllocated;
  if (remainder > 0 && validUserIds.has(payerId)) {
    // El pagador també "paga" (consumeix) la resta
    allocations[payerId] = toCents((allocations[payerId] || 0) - remainder);
  }

  return { allocations };
};

/**
 * Estratègia SHARES: Repartiment ponderat.
 * Pura i amb protecció d'Overflow.
 */
const calculateSharesSplit = (
  exp: Expense,
  validUserIds: Set<string>,
  getCanonicalId: (id: string) => string | undefined
): SplitResult => {
  const allocations: Record<string, MoneyCents> = {};
  const details = exp.splitDetails || {};
  
  const entries = Object.entries(details)
    .map(([key, shares]) => ({ uid: getCanonicalId(key), shares }))
    .filter((entry): entry is { uid: string, shares: number } => !!entry.uid && validUserIds.has(entry.uid))
    .sort((a, b) => a.uid.localeCompare(b.uid));

  const totalShares = entries.reduce((acc, curr) => acc + curr.shares, 0);

  if (totalShares <= 0) return { allocations };

  // 1. Càlcul base
  let totalBaseAllocated = 0;
  const distributionList = entries.map(entry => {
    // PROTECCIÓ OVERFLOW: Comprovació de seguretat abans de multiplicar
    const safeAmount = BigInt(exp.amount);
    const safeShares = BigInt(entry.shares);
    const safeTotal = BigInt(totalShares);
    
    // (Amount * Shares) / Total
    const rawBigInt = (safeAmount * safeShares) / safeTotal;
    
    // Tornem a Number (segur perquè raw <= amount, i amount <= MAX_SAFE_INTEGER per validació Zod)
    const rawAmount = Number(rawBigInt);

    totalBaseAllocated += rawAmount;
    return { ...entry, baseAmount: rawAmount };
  });

  const remainder = exp.amount - totalBaseAllocated;
  
  // 2. Distribució determinista
  const offset = getStableDistributionOffset(exp.id, distributionList.length);
  const count = distributionList.length;

  distributionList.forEach((item, i) => {
    const rotatedIndex = (i - offset + count) % count;
    const extraCent = rotatedIndex < remainder ? 1 : 0;
    const finalAmount = toCents(item.baseAmount + extraCent);

    allocations[item.uid] = toCents((allocations[item.uid] || 0) - finalAmount);
  });

  return { allocations };
};

// --- FUNCIÓ PRINCIPAL ---

export const calculateBalances = (expenses: Expense[], users: TripUser[]): Balance[] => {
  const balanceMap: Record<string, MoneyCents> = {};
  
  // 1. Inicialització neta
  users.forEach(u => balanceMap[u.id] = toCents(0));

  // 2. Preparació d'índexs
  const idResolver = createUserResolutionMap(users);
  const getCanonicalId = (rawId: string): string | undefined => idResolver[rawId];
  const allUserIds = users.map(u => u.id);
  const validUserIds = new Set(allUserIds); // Set per a consultes O(1) a les funcions pures

  // 3. Processament (Ara sense mutacions ocultes)
  expenses.forEach(exp => {
    const payerId = getCanonicalId(exp.payer);
    if (!payerId) return;

    const splitType = exp.splitType || SPLIT_TYPES.EQUAL;
    let result: SplitResult = { allocations: {} };

    // A. Calculem QUI ha de pagar (sense tocar saldos encara)
    switch (splitType) {
      case SPLIT_TYPES.EQUAL:
        result = calculateEqualSplit(exp, validUserIds, getCanonicalId, allUserIds);
        break;
      case SPLIT_TYPES.EXACT:
        result = calculateExactSplit(exp, payerId, validUserIds, getCanonicalId);
        break;
      case SPLIT_TYPES.SHARES:
        result = calculateSharesSplit(exp, validUserIds, getCanonicalId);
        break;
      default:
        result = calculateEqualSplit(exp, validUserIds, getCanonicalId, allUserIds);
        break;
    }

    // B. Apliquem canvis a l'estat (Centralitzat)
    
    // 1. Abonem l'import total al pagador (Crèdit)
    if (balanceMap[payerId] !== undefined) {
      balanceMap[payerId] = toCents(balanceMap[payerId] + exp.amount);
    }

    // 2. Restem els deutes als participants (Dèbit)
    Object.entries(result.allocations).forEach(([uid, debtAmount]) => {
      if (balanceMap[uid] !== undefined) {
        // debtAmount ja ve en negatiu des de les estratègies, per això sumem
        // (Saldo + (-Deute)) = Nou Saldo
        balanceMap[uid] = toCents(balanceMap[uid] + debtAmount);
      }
    });
  });

  // 4. Retorn formatat
  return Object.entries(balanceMap)
    .map(([userId, amount]) => ({ userId, amount }))
    .sort((a, b) => b.amount - a.amount);
};

// --- ALTRES FUNCIONS (Sense canvis funcionals, només manteniment) ---

export const calculateSettlements = (balances: Balance[]): Settlement[] => {
  const totalBalance = balances.reduce((acc, b) => acc + b.amount, 0);
  
  if (Math.abs(totalBalance) > 1) { // Tolerància d'1 cèntim per arrodoniments estranys
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

    if (Math.abs(debtor.amount) < 1) i++;
    if (Math.abs(creditor.amount) < 1) j++;
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