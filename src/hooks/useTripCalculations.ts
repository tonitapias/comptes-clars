// src/hooks/useTripCalculations.ts

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
  
  // 1. Optimització: Ordenació Memotitzada (Pas 1)
  // Només es re-ordena si canvien les despeses, no quan busquem.
  const sortedExpenses = useMemo(() => {
    // Fem una còpia [...expenses] per no mutar l'array original
    return [...expenses].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      // Primer per data (més recent primer)
      if (dateA !== dateB) return dateB - dateA;
      // Desempat per ID per estabilitat visual
      if (typeof a.id === 'number' && typeof b.id === 'number') return b.id - a.id;
      return String(b.id).localeCompare(String(a.id));
    });
  }, [expenses]);

  // 2. Filtratge sobre la llista ja ordenada (Pas 2)
  // Això és molt ràpid i reacciona al teclat de l'usuari.
  const filteredExpenses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const isCategoryFilterActive = filterCategory !== 'all';

    // Si no hi ha filtres, retornem directament la llista ordenada (O(1))
    if (!q && !isCategoryFilterActive) {
      return sortedExpenses;
    }
    
    return sortedExpenses.filter(e => {
        // Lògica de cerca: Títol, Pagador o Involucrats
        let matchesSearch = true;
        
        if (q) {
            // Resolució de noms per a la cerca
            const payerUser = users.find(u => u.id === e.payer || u.name === e.payer);
            const payerName = payerUser?.name.toLowerCase() || '';
            
            const involvedNames = e.involved.map(idOrName => {
                const user = users.find(u => u.id === idOrName || u.name === idOrName);
                return user ? user.name.toLowerCase() : '';
            });

            matchesSearch = 
                e.title.toLowerCase().includes(q) || 
                payerName.includes(q) ||
                involvedNames.some(name => name.includes(q));
        }

        // Lògica de categoria
        const matchesCategory = !isCategoryFilterActive || e.category === filterCategory;

        return matchesSearch && matchesCategory;
      });
  }, [sortedExpenses, searchQuery, filterCategory, users]);

  // 3. Balanços (Delegat al Service)
  const balances = useMemo(() => {
    return billingService.calculateBalances(expenses, users);
  }, [users, expenses]);

  // 4. Estadístiques (Delegat al Service)
  const categoryStats = useMemo(() => {
    return billingService.calculateCategoryStats(expenses);
  }, [expenses]);

  // 5. Liquidacions (Delegat al Service)
  const settlements = useMemo(() => {
    return billingService.calculateSettlements(balances);
  }, [balances]);

  // 6. Totals (Delegat al Service)
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