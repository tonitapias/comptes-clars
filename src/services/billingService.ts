import { Expense, TripUser, Balance, Settlement, CategoryStat } from '../types';
import { CATEGORIES } from '../utils/constants';

/**
 * Normalitza la identificació d'usuaris.
 * Resol si un string és un ID real o un nom d'usuari (per compatibilitat legacy).
 */
export const resolveUserId = (identifier: string, users: TripUser[]): string | undefined => {
  // 1. És un ID conegut?
  const userById = users.find(u => u.id === identifier);
  if (userById) return userById.id;

  // 2. És un nom que correspon a un usuari?
  const userByName = users.find(u => u.name === identifier);
  if (userByName) return userByName.id;

  return undefined;
};

/**
 * Calcula el balanç financer de cada usuari basat en totes les despeses.
 * Retorna un array ordenat de major a menor saldo.
 */
export const calculateBalances = (expenses: Expense[], users: TripUser[]): Balance[] => {
  const balanceMap: Record<string, number> = {};
  
  // Inicialitzem a 0 tots els usuaris
  users.forEach(u => balanceMap[u.id] = 0);

  expenses.forEach(exp => {
    // 1. Qui ha pagat (creditor)
    const payerId = resolveUserId(exp.payer, users);
    if (payerId && balanceMap[payerId] !== undefined) {
      balanceMap[payerId] += exp.amount;
    }

    // 2. Qui ha de pagar (deutors)
    const splitType = exp.splitType || 'equal';

    if (splitType === 'equal') {
      let rawInvolved = exp.involved?.length > 0 ? exp.involved : users.map(u => u.id);
      
      // Netegem IDs i els ordenem per determinisme en el repartiment de cèntims
      const receiversIds = rawInvolved
        .map(id => resolveUserId(id, users))
        .filter((id): id is string => id !== undefined && balanceMap[id] !== undefined)
        .sort();

      const count = receiversIds.length;
      if (count > 0) {
        const baseAmount = Math.floor(exp.amount / count);
        const remainder = exp.amount % count;

        receiversIds.forEach((uid, index) => {
          // Els primers 'remainder' usuaris paguen 1 cèntim més
          const amountToPay = baseAmount + (index < remainder ? 1 : 0);
          balanceMap[uid] -= amountToPay;
        });
      }

    } else if (splitType === 'exact') {
      const details = exp.splitDetails || {};
      Object.entries(details).forEach(([identifier, amount]) => {
        const uid = resolveUserId(identifier, users);
        if (uid && balanceMap[uid] !== undefined) {
          balanceMap[uid] -= amount;
        }
      });

    } else if (splitType === 'shares') {
      const details = exp.splitDetails || {};
      const totalShares = Object.values(details).reduce((acc, curr) => acc + curr, 0);

      if (totalShares > 0) {
        const amountPerShare = exp.amount / totalShares;
        let distributed = 0;

        // Convertim a entrades ordenades per ID per evitar errors d'arrodoniment aleatoris
        const entries = Object.entries(details)
          .map(([key, shares]) => ({ uid: resolveUserId(key, users), shares }))
          .filter((entry): entry is { uid: string, shares: number } => 
            entry.uid !== undefined && balanceMap[entry.uid] !== undefined
          )
          .sort((a, b) => (a.uid > b.uid ? 1 : -1));

        const count = entries.length;

        entries.forEach((entry, index) => {
          let amountToPay;
          if (index === count - 1) {
            // L'últim assumeix la diferència per quadratura exacta
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
 * Algoritme "Greedy" per minimitzar el nombre de transaccions necessàries per saldar deutes.
 */
export const calculateSettlements = (balances: Balance[]): Settlement[] => {
  const debts: Settlement[] = [];
  // Fem una còpia profunda per no mutar els balanços originals que venen de la UI
  const workingBalances = balances.map(b => ({ ...b }));

  const debtors = workingBalances.filter(b => b.amount < -0.01).sort((a, b) => a.amount - b.amount);
  const creditors = workingBalances.filter(b => b.amount > 0.01).sort((a, b) => b.amount - a.amount);

  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    // L'import a pagar és el mínim entre el que deu un i el que li deuen a l'altre
    const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

    debts.push({ from: debtor.userId, to: creditor.userId, amount });

    debtor.amount += amount;
    creditor.amount -= amount;

    // Avancem índexs si s'ha saldat completament (amb marge d'error per decimals)
    if (Math.abs(debtor.amount) < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return debts;
};

/**
 * Genera estadístiques per categoria.
 */
export const calculateCategoryStats = (expenses: Expense[]): CategoryStat[] => {
  const stats: Record<string, number> = {};
  const validExpenses = expenses.filter(e => e.category !== 'transfer');
  const total = validExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  if (total === 0) return [];

  validExpenses.forEach(exp => {
    const catKey = exp.category || 'other';
    if (!stats[catKey]) stats[catKey] = 0;
    stats[catKey] += exp.amount;
  });

  return Object.entries(stats).map(([id, amount]) => {
    // Busquem la info visual de la categoria (icona, color, etc.)
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