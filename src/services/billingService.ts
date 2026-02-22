// src/services/billingService.ts

import { Expense, TripUser, Balance, Settlement, CategoryStat, MoneyCents, toCents, unbrand } from '../types';
import { CATEGORIES, SPLIT_TYPES } from '../utils/constants';

export const SPECIAL_CATEGORIES = {
  TRANSFER: 'transfer',
  OTHER: 'other',
} as const;

const MIN_SETTLEMENT_CENTS = toCents(1);

interface SplitResult {
  allocations: Record<string, MoneyCents>; 
}

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

const calculateEqualSplit = (
  exp: Expense, 
  payerId: string, // [FIX]: Passem el payerId per si hem de fer un fallback
  validUserIds: Set<string>, 
  getCanonicalId: (id: string) => string | undefined,
  allUserIds: string[]
): SplitResult => {
  const allocations: Record<string, MoneyCents> = {};
  
  const rawInvolved = (exp.involved && exp.involved.length > 0) ? exp.involved : allUserIds;
  
  const receiversIds = Array.from(new Set(
    rawInvolved
      .map(id => getCanonicalId(id))
      .filter((id): id is string => !!id && validUserIds.has(id))
  )).sort(); 

  const count = receiversIds.length;
  const totalCents = unbrand(exp.amount);

  // [RISC ZERO FIX]: Si cap receptor és vàlid (ex: tots els implicats han sortit del grup), 
  // el pagador assumeix la despesa completa per evitar la creació de "diners fantasma".
  if (count === 0) {
    allocations[payerId] = toCents(-totalCents);
    return { allocations };
  }

  const absTotal = Math.abs(totalCents);
  const isNegative = totalCents < 0;

  const baseAmount = Math.floor(absTotal / count); 
  const remainder = absTotal % count; 
  const offset = getStableDistributionOffset(exp.id, count);

  receiversIds.forEach((uid, i) => {
    const rotatedIndex = (i - offset + count) % count;
    const paysExtraCent = rotatedIndex < remainder;
    const amountToPay = baseAmount + (paysExtraCent ? 1 : 0);
    
    allocations[uid] = toCents(isNegative ? amountToPay : -amountToPay);
  });

  return { allocations };
};

const calculateExactSplit = (
  exp: Expense,
  payerId: string,
  validUserIds: Set<string>,
  getCanonicalId: (id: string) => string | undefined
): SplitResult => {
  const allocations: Record<string, MoneyCents> = {};
  const details = exp.splitDetails || {};
  let totalAllocated = 0; 

  Object.entries(details).forEach(([identifier, amount]) => {
    const uid = getCanonicalId(identifier);
    if (uid && validUserIds.has(uid)) {
      const currentDebt = unbrand(allocations[uid] || toCents(0));
      const amountVal = unbrand(amount);
      
      allocations[uid] = toCents(currentDebt - amountVal);
      totalAllocated += amountVal;
    }
  });

  const remainder = unbrand(exp.amount) - totalAllocated;
  
  // [RISC ZERO FIX]: Assignació incondicional al payer de qualsevol desajust de cèntims o quantitats
  if (remainder !== 0) {
    const currentPayerDebt = unbrand(allocations[payerId] || toCents(0));
    allocations[payerId] = toCents(currentPayerDebt - remainder);
  }

  return { allocations };
};

const calculateSharesSplit = (
  exp: Expense,
  payerId: string, // [FIX]: Passem el payerId
  validUserIds: Set<string>,
  getCanonicalId: (id: string) => string | undefined
): SplitResult => {
  const allocations: Record<string, MoneyCents> = {};
  const details = exp.splitDetails || {};
  
  const totalCents = unbrand(exp.amount);
  const absTotal = Math.abs(totalCents);
  const isNegative = totalCents < 0;

  const entries = Object.entries(details)
    .map(([key, shares]) => ({ uid: getCanonicalId(key), shares: Math.max(0, Number(shares)) })) 
    .filter((entry): entry is { uid: string, shares: number } => !!entry.uid && validUserIds.has(entry.uid) && entry.shares > 0)
    .sort((a, b) => a.uid.localeCompare(b.uid));

  const totalShares = entries.reduce((acc, curr) => acc + curr.shares, 0);

  // [RISC ZERO FIX]: Si no hi ha "parts" vàlides, el pagador s'ho empassa
  if (totalShares <= 0) {
    allocations[payerId] = toCents(-totalCents);
    return { allocations };
  }

  let totalBaseAllocated = 0;
  const distributionList = entries.map(entry => {
    const safeAmount = BigInt(absTotal); 
    const safeShares = BigInt(Math.round(entry.shares)); 
    const safeTotal = BigInt(Math.round(totalShares));
    
    const rawBigInt = (safeAmount * safeShares) / safeTotal;
    const rawAmount = Number(rawBigInt);

    totalBaseAllocated += rawAmount;
    return { ...entry, baseAmount: rawAmount };
  });

  const remainder = absTotal - totalBaseAllocated;
  
  const offset = getStableDistributionOffset(exp.id, distributionList.length);
  const count = distributionList.length;

  distributionList.forEach((item, i) => {
    const rotatedIndex = (i - offset + count) % count;
    const extraCent = rotatedIndex < remainder ? 1 : 0;
    const currentDebt = unbrand(allocations[item.uid] || toCents(0));
    const finalAbsAmount = item.baseAmount + extraCent;

    allocations[item.uid] = toCents(currentDebt + (isNegative ? finalAbsAmount : -finalAbsAmount));
  });

  return { allocations };
};

export const calculateBalances = (expenses: Expense[], users: TripUser[]): Balance[] => {
  const balanceMap: Record<string, MoneyCents> = {};
  
  users.forEach(u => balanceMap[u.id] = toCents(0));

  const idResolver = createUserResolutionMap(users);
  const getCanonicalId = (rawId: string): string | undefined => idResolver[rawId];
  const allUserIds = users.map(u => u.id);
  const validUserIds = new Set(allUserIds);

  expenses.forEach(exp => {
    const payerId = getCanonicalId(exp.payer);
    // Si el pagador no és vàlid, directament ignorem la despesa sencera per evitar inestabilitats
    if (!payerId) return;

    const splitType = exp.splitType || SPLIT_TYPES.EQUAL;
    let result: SplitResult = { allocations: {} };

    switch (splitType) {
      case SPLIT_TYPES.EQUAL:
        result = calculateEqualSplit(exp, payerId, validUserIds, getCanonicalId, allUserIds);
        break;
      case SPLIT_TYPES.EXACT:
        result = calculateExactSplit(exp, payerId, validUserIds, getCanonicalId);
        break;
      case SPLIT_TYPES.SHARES:
        result = calculateSharesSplit(exp, payerId, validUserIds, getCanonicalId);
        break;
      default:
        result = calculateEqualSplit(exp, payerId, validUserIds, getCanonicalId, allUserIds);
        break;
    }

    if (balanceMap[payerId] !== undefined) {
      const current = unbrand(balanceMap[payerId]);
      balanceMap[payerId] = toCents(current + unbrand(exp.amount));
    }

    Object.entries(result.allocations).forEach(([uid, debtAmount]) => {
      if (balanceMap[uid] !== undefined) {
        const current = unbrand(balanceMap[uid]);
        const debt = unbrand(debtAmount);
        balanceMap[uid] = toCents(current + debt);
      }
    });
  });

  return Object.entries(balanceMap)
    .map(([userId, amount]) => ({ userId, amount }))
    .sort((a, b) => b.amount - a.amount);
};

export const calculateSettlements = (balances: Balance[]): Settlement[] => {
  const totalBalance = balances.reduce((acc, b) => acc + unbrand(b.amount), 0);
  
  if (Math.abs(totalBalance) > 1) { 
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

    if (!debtor || !creditor) break;

    const amount = toCents(Math.min(Math.abs(unbrand(debtor.amount)), unbrand(creditor.amount)));

    if (amount >= MIN_SETTLEMENT_CENTS) {
      debts.push({ 
        from: debtor.userId, 
        to: creditor.userId, 
        amount 
      });
    }

    debtor.amount = toCents(unbrand(debtor.amount) + unbrand(amount));
    creditor.amount = toCents(unbrand(creditor.amount) - unbrand(amount));

    if (Math.abs(unbrand(debtor.amount)) < 1) i++;
    if (Math.abs(unbrand(creditor.amount)) < 1) j++;
  }

  return debts;
};

export const calculateCategoryStats = (expenses: Expense[]): CategoryStat[] => {
  const stats: Record<string, MoneyCents> = {};
  
  const validExpenses = expenses.filter(e => e.category !== SPECIAL_CATEGORIES.TRANSFER);
  const total = validExpenses.reduce((acc, curr) => acc + unbrand(curr.amount), 0);

  if (total === 0) return [];

  validExpenses.forEach(exp => {
    const catKey = exp.category || SPECIAL_CATEGORIES.OTHER;
    const current = unbrand(stats[catKey] || toCents(0));
    stats[catKey] = toCents(current + unbrand(exp.amount));
  });

  return Object.entries(stats).map(([id, amount]) => {
    const catInfo = CATEGORIES.find(c => c.id === id) || 
                   CATEGORIES.find(c => c.id === SPECIAL_CATEGORIES.OTHER) || 
                   CATEGORIES[0];
    
    return {
      ...catInfo,
      amount,
      percentage: (unbrand(amount) / total) * 100
    };
  }).sort((a, b) => b.amount - a.amount);
};

export const calculateTotalSpending = (expenses: Expense[]): MoneyCents => {
  const total = expenses
    .filter(e => e.category !== SPECIAL_CATEGORIES.TRANSFER)
    .reduce((acc, curr) => acc + unbrand(curr.amount), 0);
    
  return toCents(total);
};

export const getUserBalance = (userId: string | undefined, balances: Balance[]): MoneyCents => {
  if (!userId) return toCents(0);
  const userBalance = balances.find(b => b.userId === userId);
  return userBalance ? userBalance.amount : toCents(0);
};

export const canUserLeaveTrip = (userId: string | undefined, balances: Balance[], maxMarginCents: number): boolean => {
  const balanceCents = unbrand(getUserBalance(userId, balances));
  return Math.abs(balanceCents) <= maxMarginCents;
};