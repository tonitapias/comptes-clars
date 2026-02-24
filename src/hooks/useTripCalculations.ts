// src/hooks/useTripCalculations.ts

import { useMemo, useDeferredValue } from 'react';
import type { Expense, TripUser, MoneyCents, Payment } from '../types';
import * as billingService from '../services/billingService';

interface CalculationsResult {
  filteredExpenses: Expense[];
  balances: ReturnType<typeof billingService.calculateBalances>;
  categoryStats: ReturnType<typeof billingService.calculateCategoryStats>;
  settlements: ReturnType<typeof billingService.calculateSettlements>;
  totalGroupSpending: MoneyCents;
  displayedTotal: MoneyCents;
  isSearching: boolean; 
  isCalculating: boolean; 
}

export function useTripCalculations(
  expenses: Expense[], 
  users: TripUser[], 
  payments: Payment[], 
  searchQuery: string, 
  filterCategory: string
): CalculationsResult {
  
  // [MILLORA FASE 2]: Utilitzem la funcionalitat nativa de React 18 per a cerques no bloquejants.
  // Això elimina la necessitat d'usar `useState` i `setTimeout`, reduint els re-renders.
  const deferredQuery = useDeferredValue(searchQuery);
  const isSearching = searchQuery !== deferredQuery;

  const userSearchIndex = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach(u => {
      map[u.id] = u.name.toLowerCase();
    });
    return map;
  }, [users]);

  const searchIndexMap = useMemo(() => {
    const map = new Map<string | number, string>();
    expenses.forEach(e => {
      const payerName = userSearchIndex[e.payer] || '';
      const involvedNames = e.involved.map(uid => userSearchIndex[uid] || '').join(' ');
      const searchString = `${e.title} ${payerName} ${involvedNames}`.toLowerCase();
      map.set(e.id, searchString);
    });
    return map;
  }, [expenses, userSearchIndex]);

  const filteredExpenses = useMemo(() => {
    const q = (deferredQuery || '').toLowerCase().trim();
    const isCategoryFilterActive = filterCategory !== 'all';

    // 1. [MILLORA FASE 2]: FILTRAR PRIMER. Així no ordenem despeses que igualment amagarem.
    let result = expenses;
    
    if (q || isCategoryFilterActive) {
        result = expenses.filter(e => {
            if (isCategoryFilterActive && e.category !== filterCategory) return false;
            if (q) {
                const searchStr = searchIndexMap.get(e.id);
                if (!searchStr || !searchStr.includes(q)) return false;
            }
            return true;
        });
    }

    // 2. ORDENAR NOMÉS EL QUE QUEDA
    return result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateB - dateA;
      if (typeof a.id === 'number' && typeof b.id === 'number') return b.id - a.id;
      return String(b.id).localeCompare(String(a.id));
    });
  }, [expenses, deferredQuery, filterCategory, searchIndexMap]);

  const displayedTotal = useMemo(() => 
    billingService.calculateTotalSpending(filteredExpenses), 
  [filteredExpenses]);

  const balances = useMemo(() => billingService.calculateBalances(expenses, users, payments), [expenses, users, payments]);
  const categoryStats = useMemo(() => billingService.calculateCategoryStats(expenses), [expenses]);
  const settlements = useMemo(() => billingService.calculateSettlements(balances), [balances]);
  const totalGroupSpending = useMemo(() => billingService.calculateTotalSpending(expenses), [expenses]);

  return { 
    filteredExpenses,
    balances, 
    categoryStats, 
    settlements, 
    totalGroupSpending, 
    displayedTotal,
    isSearching,
    isCalculating: false 
  };
}