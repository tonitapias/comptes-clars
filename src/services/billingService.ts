// src/services/billingService.ts

import { Expense, TripUser, Balance, Settlement, CategoryStat, MoneyCents, toCents, unbrand, Payment } from '../types';
import { CATEGORIES, SPLIT_TYPES } from '../utils/constants';
import { BUSINESS_RULES } from '../config/businessRules'; 

export const SPECIAL_CATEGORIES = {
  TRANSFER: 'transfer',
  OTHER: 'other',
} as const;

// Entitat mínima de moneda (1 cèntim)
const MIN_SETTLEMENT_CENTS = toCents(1);

interface SplitResult {
  allocations: Record<string, MoneyCents>; 
}

export const resolveUserId = (identifier: string, users: TripUser[]): string | undefined => {
  if (!identifier) return undefined;
  const userById = users.find(u => u.id === identifier);
  return userById?.id;
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
  payerId: string, 
  getCanonicalId: (id: string) => string | undefined,
  allUserIds: string[]
): SplitResult => {
  const allocations: Record<string, MoneyCents> = {};
  const rawInvolved = (exp.involved && exp.involved.length > 0) ? exp.involved : allUserIds;
  const receiversIds = Array.from(new Set(
    rawInvolved
      .map(id => getCanonicalId(id))
      .filter((id): id is string => !!id)
  )).sort(); 

  const count = receiversIds.length;
  const totalCents = unbrand(exp.amount);

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
  getCanonicalId: (id: string) => string | undefined
): SplitResult => {
  const allocations: Record<string, MoneyCents> = {};
  const details = exp.splitDetails || {};
  let totalAllocated = 0; 

  for (const identifier in details) {
    const uid = getCanonicalId(identifier);
    if (uid) {
      const currentDebt = unbrand(allocations[uid] || toCents(0));
      const amountVal = unbrand(details[identifier]);
      allocations[uid] = toCents(currentDebt - amountVal);
      totalAllocated += amountVal;
    }
  }

  const remainder = unbrand(exp.amount) - totalAllocated;
  if (remainder !== 0) {
    const currentPayerDebt = unbrand(allocations[payerId] || toCents(0));
    allocations[payerId] = toCents(currentPayerDebt - remainder);
  }

  return { allocations };
};

const calculateSharesSplit = (
  exp: Expense,
  payerId: string, 
  getCanonicalId: (id: string) => string | undefined
): SplitResult => {
  const allocations: Record<string, MoneyCents> = {};
  const details = exp.splitDetails || {};
  
  const totalCents = unbrand(exp.amount);
  const absTotal = Math.abs(totalCents);
  const isNegative = totalCents < 0;

  const entries = Object.entries(details)
    .map(([key, shares]) => ({ uid: getCanonicalId(key), shares: Math.max(0, Number(shares)) })) 
    .filter((entry): entry is { uid: string, shares: number } => !!entry.uid && entry.shares > 0)
    .sort((a, b) => a.uid.localeCompare(b.uid));

  const totalShares = entries.reduce((acc, curr) => acc + curr.shares, 0);

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

export const calculateBalances = (expenses: Expense[], users: TripUser[], payments: Payment[] = []): Balance[] => {
  const balanceMap: Record<string, MoneyCents> = {};
  
  users.forEach(u => balanceMap[u.id] = toCents(0));

  const allUserIds = users.map(u => u.id);
  const validUserIds = new Set(allUserIds);
  
  const getCanonicalId = (rawId: string): string | undefined => validUserIds.has(rawId) ? rawId : undefined;
  
  expenses.forEach(exp => {
    const payerId = getCanonicalId(exp.payer);
    if (!payerId) return;

    const splitType = exp.splitType || SPLIT_TYPES.EQUAL;
    let result: SplitResult = { allocations: {} };

    switch (splitType) {
      case SPLIT_TYPES.EQUAL:
        result = calculateEqualSplit(exp, payerId, getCanonicalId, allUserIds);
        break;
      case SPLIT_TYPES.EXACT:
        result = calculateExactSplit(exp, payerId, getCanonicalId);
        break;
      case SPLIT_TYPES.SHARES:
        result = calculateSharesSplit(exp, payerId, getCanonicalId);
        break;
      default:
        result = calculateEqualSplit(exp, payerId, getCanonicalId, allUserIds);
        break;
    }

    if (balanceMap[payerId] !== undefined) {
      const current = unbrand(balanceMap[payerId]);
      balanceMap[payerId] = toCents(current + unbrand(exp.amount));
    }

    for (const uid in result.allocations) {
      if (balanceMap[uid] !== undefined) {
        const current = unbrand(balanceMap[uid]);
        const debt = unbrand(result.allocations[uid]);
        balanceMap[uid] = toCents(current + debt);
      }
    }
  });

  payments.forEach(payment => {
    const payerId = getCanonicalId(payment.from);
    const receiverId = getCanonicalId(payment.to);

    if (payerId && balanceMap[payerId] !== undefined) {
       balanceMap[payerId] = toCents(unbrand(balanceMap[payerId]) + unbrand(payment.amount));
    }
    if (receiverId && balanceMap[receiverId] !== undefined) {
       balanceMap[receiverId] = toCents(unbrand(balanceMap[receiverId]) - unbrand(payment.amount));
    }
  });

  return Object.entries(balanceMap)
    .map(([userId, amount]) => ({ userId, amount }))
    .sort((a, b) => unbrand(b.amount) - unbrand(a.amount));
};

export const calculateSettlements = (balances: Balance[]): Settlement[] => {
  const totalBalance = balances.reduce((acc, b) => acc + unbrand(b.amount), 0);
  
  if (Math.abs(totalBalance) >= BUSINESS_RULES.SETTLED_TOLERANCE_MARGIN) { 
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

    if (Math.abs(unbrand(debtor.amount)) < BUSINESS_RULES.SETTLED_TOLERANCE_MARGIN) i++;
    if (Math.abs(unbrand(creditor.amount)) < BUSINESS_RULES.SETTLED_TOLERANCE_MARGIN) j++;
  }

  return debts;
};

export const calculateCategoryStats = (expenses: Expense[]): CategoryStat[] => {
  const stats: Record<string, number> = {}; 
  
  const validExpenses = expenses.filter(e => e.category !== SPECIAL_CATEGORIES.TRANSFER);
  
  validExpenses.forEach(exp => {
    const catKey = exp.category || SPECIAL_CATEGORIES.OTHER;
    const current = stats[catKey] || 0;
    stats[catKey] = current + unbrand(exp.amount);
  });

  let totalValidSpending = 0;
  for (const key in stats) {
      if (stats[key] < 0) stats[key] = 0;
      totalValidSpending += stats[key];
  }

  if (totalValidSpending === 0) return [];

  return Object.entries(stats).map(([id, amount]) => {
    const catInfo = CATEGORIES.find(c => c.id === id) || 
                   CATEGORIES.find(c => c.id === SPECIAL_CATEGORIES.OTHER) || 
                   CATEGORIES[0];
    
    return {
      ...catInfo,
      amount: toCents(amount),
      percentage: (amount / totalValidSpending) * 100
    };
  }).sort((a, b) => unbrand(b.amount) - unbrand(a.amount));
};

export const calculateTotalSpending = (expenses: Expense[]): MoneyCents => {
  let total = 0;
  for (let i = 0; i < expenses.length; i++) {
    if (expenses[i].category !== SPECIAL_CATEGORIES.TRANSFER) {
      total += unbrand(expenses[i].amount);
    }
  }
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