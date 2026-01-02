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

  // 2. Balanços
  const balances = useMemo(() => {
    const balanceMap: Record<string, number> = {}; 
    users.forEach(u => balanceMap[u] = 0);
    
    expenses.forEach(exp => {
      // Sumar al pagador (qui avança els diners sempre suma)
      if (balanceMap[exp.payer] !== undefined) balanceMap[exp.payer] += exp.amount;
      
      if (exp.category === 'transfer') {
         // --- CORRECCIÓ APLICADA ---
         // Si és transferència, dividim l'import entre tots els receptors seleccionats.
         // Això evita que si marques 2 persones, es resti l'import total a totes dues.
         const splitAmount = exp.involved.length > 0 ? exp.amount / exp.involved.length : 0;
         
         exp.involved.forEach(p => { 
             if (balanceMap[p] !== undefined) balanceMap[p] -= splitAmount; 
         });
      } else {
         // Si és despesa normal, dividim entre els participants
         const participants = exp.involved?.length > 0 ? exp.involved : users;
         const splitCount = participants.length;
         const splitAmount = splitCount > 0 ? exp.amount / splitCount : 0;
         
         participants.forEach(p => { if (balanceMap[p] !== undefined) balanceMap[p] -= splitAmount; });
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
      // Castegem l'ID per assegurar que coincideix amb CategoryId, si no fallback
      const catInfo = CATEGORIES.find(c => c.id === id) || CATEGORIES.find(c => c.id === 'other')!;
      return { 
        id: catInfo.id, 
        amount, 
        label: catInfo.label,
        icon: catInfo.icon,
        color: catInfo.color,
        barColor: catInfo.barColor,
        percentage: (amount / total) * 100 
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  // 4. Liquidacions (Algorisme Greedy)
  const settlements = useMemo(() => {
    let debts: Settlement[] = [];
    // Creem còpies per no mutar l'estat original
    let debtors = balances.filter(b => b.balance < -0.01).map(b => ({ ...b }));
    let creditors = balances.filter(b => b.balance > 0.01).map(b => ({ ...b }));
    
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      let debtor = debtors[i]; 
      let creditor = creditors[j];
      
      let amount = Math.min(Math.abs(debtor.balance), creditor.balance);
      debts.push({ from: debtor.user, to: creditor.user, amount });
      
      debtor.balance += amount; 
      creditor.balance -= amount;
      
      if (Math.abs(debtor.balance) < 0.01) i++; 
      if (creditor.balance < 0.01) j++;
    }
    return debts;
  }, [balances]);

  const totalGroupSpending = expenses.filter(e => e.category !== 'transfer').reduce((acc, curr) => acc + curr.amount, 0);

  return { filteredExpenses, balances, categoryStats, settlements, totalGroupSpending };
}