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
  // Això evita fer un users.find() dins del bucle de filtratge (de O(N*M) a O(N)).
  const userSearchIndex = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach(u => {
      // Normalitzem a minúscules per facilitar la cerca
      const nameKey = u.name.toLowerCase();
      map[u.id] = nameKey;
      // També indexem per nom directament per si hi ha dades legacy
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
        // Lògica de categoria (més ràpida, la comprovem primer)
        if (isCategoryFilterActive && e.category !== filterCategory) {
            return false;
        }

        // Si no hi ha text de cerca, ja hem acabat
        if (!q) return true;

        // Lògica de cerca optimitzada usant l'índex
        const payerName = userSearchIndex[e.payer] || '';
        
        // Optimització: mirem títol i pagador primer
        if (e.title.toLowerCase().includes(q) || payerName.includes(q)) {
            return true;
        }

        // Només si no trobem res, iterem pels involucrats (més costós però inevitable)
        // Utilitzem l'índex també aquí per evitar .find()
        const involvedMatch = e.involved.some(idOrName => {
            const name = userSearchIndex[idOrName] || '';
            return name.includes(q);
        });

        return involvedMatch;
      });
  }, [sortedExpenses, searchQuery, filterCategory, userSearchIndex]); // Depenem de l'índex, no de 'users' directament

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