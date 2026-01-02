import { useMemo } from 'react';
import { CATEGORIES } from '../utils/constants';
import type { Expense, Balance, Settlement, CategoryStat } from '../types';

interface CalculationsResult {
  filteredExpenses: Expense[];
  balances: Balance[];
  categoryStats: CategoryStat[];
  settlements: Settlement[];
  totalGroupSpending: number;
}

export function useTripCalculations(
  expenses: Expense[], 
  users: string[], 
  searchQuery: string, 
  filterCategory: string
): CalculationsResult {
  
  // 1. Filtrar
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
        const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.payer.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === 'all' || e.category === filterCategory;
        return matchesSearch && matchesCategory;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || Number(b.id) - Number(a.id));
  }, [expenses, searchQuery, filterCategory]);

  // 2. Balanços (ARA AMB MATH ENTERA)
  const balances = useMemo(() => {
    const balanceMap: Record<string, number> = {}; 
    users.forEach(u => balanceMap[u] = 0);
    
    expenses.forEach(exp => {
      // Sumar al pagador (en cèntims)
      if (balanceMap[exp.payer] !== undefined) balanceMap[exp.payer] += exp.amount;
      
      const receivers = exp.involved?.length > 0 ? exp.involved : users;
      const count = receivers.length;
      
      if (count > 0) {
          // DIVISIÓ ENTERA AMB REPARTIMENT DE RESIDU
          // Ex: 1000 / 3 = 333 (base) i sobra 1 (remainder)
          const baseAmount = Math.floor(exp.amount / count);
          const remainder = exp.amount % count;

          receivers.forEach((p, index) => {
             // Els primers 'remainder' usuaris paguen 1 cèntim més per quadrar
             const amountToPay = baseAmount + (index < remainder ? 1 : 0);
             
             if (balanceMap[p] !== undefined) {
                 balanceMap[p] -= amountToPay;
             }
          });
      }
    });
    // Ordenem
    return users.map(user => ({ user, balance: balanceMap[user] })).sort((a, b) => b.balance - a.balance);
  }, [users, expenses]);

  // 3. Estadístiques
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    // Suma en cèntims
    const total = expenses.filter(e => e.category !== 'transfer').reduce((acc, curr) => acc + curr.amount, 0);
    
    if (total === 0) return [];
    
    expenses.filter(e => e.category !== 'transfer').forEach(exp => {
      const catKey = exp.category || 'other';
      if (!stats[catKey]) stats[catKey] = 0;
      stats[catKey] += exp.amount;
    });
    
    return Object.entries(stats).map(([id, amount]) => {
      const catInfo = CATEGORIES.find(c => c.id === id) || CATEGORIES.find(c => c.id === 'other')!;
      return { 
        id: catInfo.id, 
        amount, // Això són cèntims, el DonutChart només vol proporcions així que està bé
        label: catInfo.label,
        icon: catInfo.icon,
        color: catInfo.color,
        barColor: catInfo.barColor,
        percentage: (amount / total) * 100 
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  // 4. Liquidacions (Algorisme Greedy amb Enters)
  const settlements = useMemo(() => {
    let debts: Settlement[] = [];
    // Ja no cal filtrar per < 0.01, utilitzem 0 estricte perquè són enters
    let debtors = balances.filter(b => b.balance < 0).map(b => ({ ...b }));
    let creditors = balances.filter(b => b.balance > 0).map(b => ({ ...b }));
    
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      let debtor = debtors[i]; 
      let creditor = creditors[j];
      
      // Mínim en valor absolut
      let amount = Math.min(Math.abs(debtor.balance), creditor.balance);
      debts.push({ from: debtor.user, to: creditor.user, amount });
      
      debtor.balance += amount; 
      creditor.balance -= amount;
      
      // Com que són enters, el 0 és 0 absolut.
      if (debtor.balance === 0) i++; 
      if (creditor.balance === 0) j++;
    }
    return debts;
  }, [balances]);

  const totalGroupSpending = expenses.filter(e => e.category !== 'transfer').reduce((acc, curr) => acc + curr.amount, 0);

  return { filteredExpenses, balances, categoryStats, settlements, totalGroupSpending };
}