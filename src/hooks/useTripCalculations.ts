import { useMemo } from 'react';
import { CATEGORIES } from '../utils/constants';
import type { Expense, Balance, Settlement, CategoryStat } from '../types';

interface CalculationsResult {
  filteredExpenses: Expense[];
  balances: Balance[];
  categoryStats: CategoryStat[];
  settlements: Settlement[];
  totalGroupSpending: number;
  displayedTotal: number;
}

export function useTripCalculations(
  expenses: Expense[], 
  users: string[], 
  searchQuery: string, 
  filterCategory: string
): CalculationsResult {
  
  // 1. Filtrar i Ordenar
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = 
            e.title.toLowerCase().includes(q) || 
            e.payer.toLowerCase().includes(q) ||
            e.involved.some(person => person.toLowerCase().includes(q));
            
        const matchesCategory = filterCategory === 'all' || e.category === filterCategory;
        return matchesSearch && matchesCategory;
      }).sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateB - dateA;
        if (typeof a.id === 'number' && typeof b.id === 'number') return b.id - a.id;
        return String(b.id).localeCompare(String(a.id));
      });
  }, [expenses, searchQuery, filterCategory]);

  // 2. Balanços
  const balances = useMemo(() => {
    const balanceMap: Record<string, number> = {}; 
    users.forEach(u => balanceMap[u] = 0);
    
    expenses.forEach(exp => {
      // Treballem sempre amb la unitat mínima (cèntims) per evitar errors de coma flotant
      // exp.amount ja ve en cèntims des de la base de dades.
      
      // 1. El pagador "posa" els diners (suma positiva)
      if (balanceMap[exp.payer] !== undefined) {
          balanceMap[exp.payer] = (balanceMap[exp.payer] || 0) + exp.amount;
      }
      
      const splitType = exp.splitType || 'equal';
      
      // 2. Restem a qui li toca pagar (deute negatiu)
      if (splitType === 'equal') {
          // --- REPARTIMENT IGUALITARI ---
          const receivers = exp.involved?.length > 0 ? exp.involved : users;
          const count = receivers.length;
          
          if (count > 0) {
              const baseAmount = Math.floor(exp.amount / count);
              const remainder = exp.amount % count;

              receivers.forEach((p, index) => {
                 // Els primers 'remainder' usuaris paguen 1 cèntim més per quadrar el total
                 const amountToPay = baseAmount + (index < remainder ? 1 : 0);
                 if (balanceMap[p] !== undefined) {
                     balanceMap[p] -= amountToPay;
                 }
              });
          }

      } else if (splitType === 'exact') {
          // --- REPARTIMENT EXACTE ---
          const details = exp.splitDetails || {};
          let distributedAmount = 0;

          Object.entries(details).forEach(([uid, amount]) => {
              // amount ve en cèntims
              if (balanceMap[uid] !== undefined) {
                  balanceMap[uid] -= amount;
                  distributedAmount += amount;
              }
          });
          // La diferència (si n'hi ha) es queda al pagador original, així que no cal fer res més.

      } else if (splitType === 'shares') {
          // --- REPARTIMENT PER PARTS/PESOS ---
          const details = exp.splitDetails || {};
          const totalShares = Object.values(details).reduce((acc, curr) => acc + curr, 0);
          
          if (totalShares > 0) {
              const amountPerShare = exp.amount / totalShares; // Això pot tenir decimals
              
              let distributed = 0;
              const involvedUsers = Object.keys(details);
              
              involvedUsers.forEach((uid, index) => {
                  if (balanceMap[uid] !== undefined) {
                      const shares = details[uid];
                      let amountToPay;

                      // L'últim usuari carrega amb l'arrodoniment final per assegurar que suma 0
                      if (index === involvedUsers.length - 1) {
                          amountToPay = exp.amount - distributed;
                      } else {
                          // Arrodonim cada part
                          amountToPay = Math.floor(shares * amountPerShare);
                      }
                      
                      balanceMap[uid] -= amountToPay;
                      distributed += amountToPay;
                  }
              });
          }
      }
    });
    
    // Convertim el mapa a array i ordenem
    return users.map(user => ({ user, balance: balanceMap[user] || 0 }))
                .sort((a, b) => b.balance - a.balance);
  }, [users, expenses]);

  // 3. Estadístiques
  const categoryStats = useMemo(() => {
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
      const catInfo = CATEGORIES.find(c => c.id === id) || CATEGORIES.find(c => c.id === 'other') || CATEGORIES[0];
      return { 
        id: catInfo.id, amount, label: catInfo.label, icon: catInfo.icon,
        color: catInfo.color, barColor: catInfo.barColor, percentage: (amount / total) * 100 
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  // 4. Liquidacions (Algoritme de Deutes)
  const settlements = useMemo(() => {
    const debts: Settlement[] = [];
    // Copia profunda per no mutar l'estat original
    const debtors = balances.filter(b => b.balance < -1).map(b => ({ ...b })); // -1 per tolerància de rounding
    const creditors = balances.filter(b => b.balance > 1).map(b => ({ ...b }));
    
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i]; 
      const creditor = creditors[j];
      
      // Quan pot pagar el deutor com a màxim? O el seu deute sencer, o el que li falta al creditor.
      const amount = Math.min(Math.abs(debtor.balance), creditor.balance);
      
      debts.push({ from: debtor.user, to: creditor.user, amount });
      
      debtor.balance += amount; 
      creditor.balance -= amount;
      
      // Si el deute és menys d'1 cèntim, passem al següent
      if (Math.abs(debtor.balance) < 1) i++; 
      if (creditor.balance < 1) j++;
    }
    return debts;
  }, [balances]);

  const totalGroupSpending = expenses.filter(e => e.category !== 'transfer').reduce((acc, curr) => acc + curr.amount, 0);
  const displayedTotal = filteredExpenses.filter(e => e.category !== 'transfer').reduce((acc, curr) => acc + curr.amount, 0);

  return { filteredExpenses, balances, categoryStats, settlements, totalGroupSpending, displayedTotal };
}