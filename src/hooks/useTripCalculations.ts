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
  
  // 1. Filtrar i Ordenar (Igual que abans)
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

  // 2. Balanços (AMB NOVA LÒGICA SPLIT)
  const balances = useMemo(() => {
    const balanceMap: Record<string, number> = {}; 
    users.forEach(u => balanceMap[u] = 0);
    
    expenses.forEach(exp => {
      // 1. El pagador "posa" els diners (suma positiva)
      if (balanceMap[exp.payer] !== undefined) balanceMap[exp.payer] += exp.amount;
      
      const splitType = exp.splitType || 'equal';
      
      // 2. Restem a qui li toca pagar (deute negatiu)
      if (splitType === 'equal') {
          // --- REPARTIMENT IGUALITARI (Lògica Original) ---
          const receivers = exp.involved?.length > 0 ? exp.involved : users;
          const count = receivers.length;
          
          if (count > 0) {
              const baseAmount = Math.floor(exp.amount / count);
              const remainder = exp.amount % count;

              receivers.forEach((p, index) => {
                 const amountToPay = baseAmount + (index < remainder ? 1 : 0);
                 if (balanceMap[p] !== undefined) balanceMap[p] -= amountToPay;
              });
          }

      } else if (splitType === 'exact') {
          // --- REPARTIMENT EXACTE ---
          // splitDetails conté { "NomUsuari": importEnCentims }
          const details = exp.splitDetails || {};
          Object.entries(details).forEach(([uid, amount]) => {
              if (balanceMap[uid] !== undefined) {
                  balanceMap[uid] -= amount;
              }
          });
          // Nota: Si la suma dels imports no quadra amb el total, la diferència la "paga" (o perd) el Payer implícitament.

      } else if (splitType === 'shares') {
          // --- REPARTIMENT PER PARTS/PESOS ---
          // splitDetails conté { "NomUsuari": numParts } ex: { "Toni": 2, "Maria": 1 }
          const details = exp.splitDetails || {};
          const totalShares = Object.values(details).reduce((acc, curr) => acc + curr, 0);
          
          if (totalShares > 0) {
              const amountPerShare = exp.amount / totalShares; // Pot tenir decimals
              
              // Per evitar problemes de cèntims perduts, fem una passada de càlcul
              let distributed = 0;
              const involvedUsers = Object.keys(details);
              
              involvedUsers.forEach((uid, index) => {
                  if (balanceMap[uid] !== undefined) {
                      const shares = details[uid];
                      // L'últim usuari es menja l'arrodoniment final per quadrar el cèntim
                      let amountToPay;
                      if (index === involvedUsers.length - 1) {
                          amountToPay = exp.amount - distributed;
                      } else {
                          amountToPay = Math.floor(shares * amountPerShare);
                      }
                      
                      balanceMap[uid] -= amountToPay;
                      distributed += amountToPay;
                  }
              });
          }
      }
    });
    return users.map(user => ({ user, balance: balanceMap[user] })).sort((a, b) => b.balance - a.balance);
  }, [users, expenses]);

  // 3. Estadístiques
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    const total = expenses.filter(e => e.category !== 'transfer').reduce((acc, curr) => acc + curr.amount, 0);
    
    if (total === 0) return [];
    
    expenses.filter(e => e.category !== 'transfer').forEach(exp => {
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

  // 4. Liquidacions
  const settlements = useMemo(() => {
    let debts: Settlement[] = [];
    let debtors = balances.filter(b => b.balance < 0).map(b => ({ ...b }));
    let creditors = balances.filter(b => b.balance > 0).map(b => ({ ...b }));
    
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      let debtor = debtors[i]; 
      let creditor = creditors[j];
      
      let amount = Math.min(Math.abs(debtor.balance), creditor.balance);
      debts.push({ from: debtor.user, to: creditor.user, amount });
      
      debtor.balance += amount; 
      creditor.balance -= amount;
      
      if (Math.abs(debtor.balance) < 0.01) i++; // Tolerància decimal
      if (Math.abs(creditor.balance) < 0.01) j++;
    }
    return debts;
  }, [balances]);

  const totalGroupSpending = expenses.filter(e => e.category !== 'transfer').reduce((acc, curr) => acc + curr.amount, 0);
  const displayedTotal = filteredExpenses.filter(e => e.category !== 'transfer').reduce((acc, curr) => acc + curr.amount, 0);

  return { filteredExpenses, balances, categoryStats, settlements, totalGroupSpending, displayedTotal };
}