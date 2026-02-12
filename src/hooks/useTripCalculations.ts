// src/hooks/useTripCalculations.ts

import { useMemo } from 'react';
import type { Expense, TripUser, MoneyCents } from '../types'; // [FIX] Importem MoneyCents
import * as billingService from '../services/billingService';

interface CalculationsResult {
  filteredExpenses: Expense[];
  balances: ReturnType<typeof billingService.calculateBalances>;
  categoryStats: ReturnType<typeof billingService.calculateCategoryStats>;
  settlements: ReturnType<typeof billingService.calculateSettlements>;
  // [FIX] Blindatge de tipus: evitem que la UI rebi un 'number' genèric
  totalGroupSpending: MoneyCents;
  displayedTotal: MoneyCents;
}

export function useTripCalculations(
  expenses: Expense[], 
  users: TripUser[], 
  searchQuery: string, 
  filterCategory: string
): CalculationsResult {
  
  // 1. Optimització: Ordenació Memotitzada
  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateB - dateA;
      if (typeof a.id === 'number' && typeof b.id === 'number') return b.id - a.id;
      return String(b.id).localeCompare(String(a.id));
    });
  }, [expenses]);

  // MILLORA: Creem un índex de cerca ràpida (ID -> Nom)
  const userSearchIndex = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach(u => {
      const nameKey = u.name.toLowerCase();
      map[u.id] = nameKey;
      if (u.name) map[u.name] = nameKey;
    });
    return map;
  }, [users]);

  // 2. Filtratge Optimitzat
  const filteredExpenses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const isCategoryFilterActive = filterCategory !== 'all';

    if (!q && !isCategoryFilterActive) {
      return sortedExpenses;
    }
    
    return sortedExpenses.filter(e => {
        if (isCategoryFilterActive && e.category !== filterCategory) {
            return false;
        }

        if (!q) return true;

        const payerName = userSearchIndex[e.payer] || '';
        
        if (e.title.toLowerCase().includes(q) || payerName.includes(q)) {
            return true;
        }

        const involvedMatch = e.involved.some(idOrName => {
            const name = userSearchIndex[idOrName] || '';
            return name.includes(q);
        });

        return involvedMatch;
      });
  }, [sortedExpenses, searchQuery, filterCategory, userSearchIndex]);

  // 3. Balanços
  const balances = useMemo(() => {
    return billingService.calculateBalances(expenses, users);
  }, [users, expenses]);

  // 4. Estadístiques
  const categoryStats = useMemo(() => {
    return billingService.calculateCategoryStats(expenses);
  }, [expenses]);

  // 5. Liquidacions
  const settlements = useMemo(() => {
    return billingService.calculateSettlements(balances);
  }, [balances]);

  // 6. Totals
  // Nota: billingService ja retorna MoneyCents, ara el tipatge ho respecta.
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