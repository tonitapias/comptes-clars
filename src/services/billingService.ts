// src/services/billingService.ts

import { Expense, TripUser, Balance, Settlement, CategoryStat } from '../types';
import { CATEGORIES } from '../utils/constants';

/**
 * Normalitza la identificació d'usuaris.
 * Prioritza ID i usa nom només per compatibilitat legacy.
 */
export const resolveUserId = (identifier: string, users: TripUser[]): string | undefined => {
  if (!identifier) return undefined;
  
  const userById = users.find(u => u.id === identifier);
  if (userById) return userById.id;

  const userByName = users.find(u => u.name === identifier);
  if (userByName) return userByName.id;

  return undefined;
};

/**
 * Calcula el balanç financer de cada usuari.
 */
export const calculateBalances = (expenses: Expense[], users: TripUser[]): Balance[] => {
  const balanceMap: Record<string, number> = {};
  
  // Inicialitzem a 0 tots els usuaris actius
  users.forEach(u => balanceMap[u.id] = 0);

  // Optimització: Creem un diccionari de noms per resolució ràpida (legacy)
  const nameToIdMap = users.reduce((acc, u) => {
    acc[u.name] = u.id;
    return acc;
  }, {} as Record<string, string>);

  // Helper intern per resoldre IDs usant el mapa optimitzat (DRY Refactor)
  const getCanonicalId = (identifier: string): string | undefined => {
    if (balanceMap[identifier] !== undefined) return identifier;
    return nameToIdMap[identifier];
  };

  expenses.forEach(exp => {
    // 1. Qui ha pagat (creditor)
    const payerId = getCanonicalId(exp.payer);
    
    if (payerId) {
      balanceMap[payerId] += exp.amount;
    }

    // 2. Qui ha de pagar (deutors)
    const splitType = exp.splitType || 'equal';

    if (splitType === 'equal') {
      const rawInvolved = (exp.involved && exp.involved.length > 0) ? exp.involved : users.map(u => u.id);
      
      const receiversIds = rawInvolved
        .map(id => getCanonicalId(id))
        .filter((id): id is string => !!id) // TypeScript type guard
        .sort(); // Sorting per determinisme en el residu

      const count = receiversIds.length;
      if (count > 0) {
        const baseAmount = Math.floor(exp.amount / count);
        const remainder = exp.amount % count;

        receiversIds.forEach((uid, index) => {
          // Repartiment del cèntim sobrant entre els primers
          const amountToPay = baseAmount + (index < remainder ? 1 : 0);
          balanceMap[uid] -= amountToPay;
        });
      }

    } else if (splitType === 'exact') {
      const details = exp.splitDetails || {};
      Object.entries(details).forEach(([identifier, amount]) => {
        const uid = getCanonicalId(identifier);
        if (uid) {
          balanceMap[uid] -= amount;
        }
      });

    } else if (splitType === 'shares') {
      const details = exp.splitDetails || {};
      const totalShares = Object.values(details).reduce((acc, curr) => acc + curr, 0);

      if (totalShares > 0) {
        const amountPerShare = exp.amount / totalShares;
        let distributed = 0;

        // Mapegem primer per tenir l'ID canònic i poder ordenar
        const entries = Object.entries(details)
          .map(([key, shares]) => ({ uid: getCanonicalId(key), shares }))
          .filter((entry): entry is { uid: string, shares: number } => !!entry.uid)
          .sort((a, b) => a.uid.localeCompare(b.uid));

        const count = entries.length;

        entries.forEach((entry, index) => {
          let amountToPay;
          if (index === count - 1) {
            amountToPay = exp.amount - distributed; // Quadratura exacta final
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

  // Filtrem per qualsevol desajust superior a 0 (cèntims enters)
  const debtors = workingBalances.filter(b => b.amount < 0).sort((a, b) => a.amount - b.amount);
  const creditors = workingBalances.filter(b => b.amount > 0).sort((a, b) => b.amount - a.amount);

  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

    if (amount > 0) {
      debts.push({ from: debtor.userId, to: creditor.userId, amount });
      debtor.amount += amount;
      creditor.amount -= amount;
    }

    // Si el balanç és 0 (o gairebé 0 per seguretat), passem al següent
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
  const validExpenses = expenses.filter(e => e.category !== 'transfer');
  const total = validExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  if (total === 0) return [];

  validExpenses.forEach(exp => {
    const catKey = exp.category || 'other';
    stats[catKey] = (stats[catKey] || 0) + exp.amount;
  });

  return Object.entries(stats).map(([id, amount]) => {
    const catInfo = CATEGORIES.find(c => c.id === id) || 
                   CATEGORIES.find(c => c.id === 'other') || 
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
    .filter(e => e.category !== 'transfer')
    .reduce((acc, curr) => acc + curr.amount, 0);
};