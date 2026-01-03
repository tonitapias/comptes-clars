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
        
        // MILLORA CERCA: Ara busquem al Títol, al Pagador O dins dels Participants (involved)
        const matchesSearch = 
            e.title.toLowerCase().includes(q) || 
            e.payer.toLowerCase().includes(q) ||
            e.involved.some(person => person.toLowerCase().includes(q)); // <--- NOVA LÍNIA
            
        const matchesCategory = filterCategory === 'all' || e.category === filterCategory;
        return matchesSearch && matchesCategory;
      }).sort((a, b) => {
        // Ordenar per data (més recent primer)
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateB - dateA;

        // Desempat segur per ID
        if (typeof a.id === 'number' && typeof b.id === 'number') {
            return b.id - a.id;
        }
        return String(b.id).localeCompare(String(a.id));
      });
  }, [expenses, searchQuery, filterCategory]);

  // 2. Balanços (Sense canvis - Math entera)
  const balances = useMemo(() => {
    const balanceMap: Record<string, number> = {}; 
    users.forEach(u => balanceMap[u] = 0);
    
    expenses.forEach(exp => {
      if (balanceMap[exp.payer] !== undefined) balanceMap[exp.payer] += exp.amount;
      
      const receivers = exp.involved?.length > 0 ? exp.involved : users;
      const count = receivers.length;
      
      if (count > 0) {
          const baseAmount = Math.floor(exp.amount / count);
          const remainder = exp.amount % count;

          receivers.forEach((p, index) => {
             const amountToPay = baseAmount + (index < remainder ? 1 : 0);
             if (balanceMap[p] !== undefined) {
                 balanceMap[p] -= amountToPay;
             }
          });
      }
    });
    return users.map(user => ({ user, balance: balanceMap[user] })).sort((a, b) => b.balance - a.balance);
  }, [users, expenses]);

  // 3. Estadístiques (Amb fallback de seguretat)
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
      
      if (debtor.balance === 0) i++; 
      if (creditor.balance === 0) j++;
    }
    return debts;
  }, [balances]);

  const totalGroupSpending = expenses.filter(e => e.category !== 'transfer').reduce((acc, curr) => acc + curr.amount, 0);
  
  // Total que es mostra en pantalla (afectat pel filtre de cerca millorat)
  const displayedTotal = filteredExpenses.filter(e => e.category !== 'transfer').reduce((acc, curr) => acc + curr.amount, 0);

  return { filteredExpenses, balances, categoryStats, settlements, totalGroupSpending, displayedTotal };
}