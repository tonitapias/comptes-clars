import { useMemo } from 'react';
import type { Expense, TripUser } from '../types';
import * as billingService from '../services/billingService';

interface CalculationsResult {
  filteredExpenses: Expense[];
  balances: ReturnType<typeof billingService.calculateBalances>;
  categoryStats: ReturnType<typeof billingService.calculateCategoryStats>;
  settlements: ReturnType<typeof billingService.calculateSettlements>;
  totalGroupSpending: number;
  displayedTotal: number;
}

export function useTripCalculations(
  expenses: Expense[], 
  users: TripUser[], 
  searchQuery: string, 
  filterCategory: string
): CalculationsResult {
  
  // 1. Filtrar i Ordenar (Lògica de Presentació, es queda al Hook)
  const filteredExpenses = useMemo(() => {
    const q = searchQuery.toLowerCase();
    
    return expenses.filter(e => {
        // Usem el servei per resoldre noms si cal, o busquem noms per filtrar
        const payerUser = users.find(u => u.id === e.payer || u.name === e.payer);
        const payerName = payerUser?.name.toLowerCase() || '';
        
        const involvedNames = e.involved.map(idOrName => {
            const user = users.find(u => u.id === idOrName || u.name === idOrName);
            return user ? user.name.toLowerCase() : '';
        });

        const matchesSearch = 
            e.title.toLowerCase().includes(q) || 
            payerName.includes(q) ||
            involvedNames.some(name => name.includes(q));
            
        const matchesCategory = filterCategory === 'all' || e.category === filterCategory;
        return matchesSearch && matchesCategory;
      }).sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateB - dateA;
        if (typeof a.id === 'number' && typeof b.id === 'number') return b.id - a.id;
        return String(b.id).localeCompare(String(a.id));
      });
  }, [expenses, searchQuery, filterCategory, users]);

  // 2. Balanços (Delegat al Service)
  const balances = useMemo(() => {
    return billingService.calculateBalances(expenses, users);
  }, [users, expenses]);

  // 3. Estadístiques (Delegat al Service)
  const categoryStats = useMemo(() => {
    return billingService.calculateCategoryStats(expenses);
  }, [expenses]);

  // 4. Liquidacions (Delegat al Service)
  const settlements = useMemo(() => {
    return billingService.calculateSettlements(balances);
  }, [balances]);

  // 5. Totals (Delegat al Service)
  const totalGroupSpending = useMemo(() => 
    billingService.calculateTotalSpending(expenses), 
  [expenses]);

  const displayedTotal = useMemo(() => 
    billingService.calculateTotalSpending(filteredExpenses), 
  [filteredExpenses]);

  return { 
    filteredExpenses, 
    balances, 
    categoryStats, 
    settlements, 
    totalGroupSpending, 
    displayedTotal 
  };
}