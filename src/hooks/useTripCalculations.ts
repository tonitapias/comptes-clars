// src/hooks/useTripCalculations.ts

import { useState, useEffect, useMemo } from 'react';
import type { Expense, TripUser, MoneyCents } from '../types';
import * as billingService from '../services/billingService';

interface CalculationsResult {
  filteredExpenses: Expense[];
  balances: ReturnType<typeof billingService.calculateBalances>;
  categoryStats: ReturnType<typeof billingService.calculateCategoryStats>;
  settlements: ReturnType<typeof billingService.calculateSettlements>;
  totalGroupSpending: MoneyCents;
  displayedTotal: MoneyCents;
  isSearching: boolean; 
}

export function useTripCalculations(
  expenses: Expense[], 
  users: TripUser[], 
  searchQuery: string, 
  filterCategory: string
): CalculationsResult {
  
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!searchQuery) {
      setDebouncedQuery('');
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setIsSearching(false);
    }, 300); 

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const userSearchIndex = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach(u => {
      const nameKey = u.name.toLowerCase();
      map[u.id] = nameKey;
    });
    return map;
  }, [users]);

  // [SAFE-FIX]: Substituït la mutació de dades (_searchString a l'Expense) per un diccionari separat.
  // Protegeix les dades i el tipatge estricte, però ofereix el mateix rendiment de lectura O(1).
  const searchIndexMap = useMemo(() => {
    const map = new Map<string | number, string>();
    expenses.forEach(e => {
      const payerName = userSearchIndex[e.payer] || '';
      const involvedNames = e.involved
        .map(uid => userSearchIndex[uid] || '')
        .join(' ');
      
      const searchString = `${e.title} ${payerName} ${involvedNames}`.toLowerCase();
      map.set(e.id, searchString);
    });
    return map;
  }, [expenses, userSearchIndex]);

  // [SAFE-FIX]: Ara ordenem i filtrem l'array original directament.
  const filteredExpenses = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    const isCategoryFilterActive = filterCategory !== 'all';

    // 1. Ordenem de manera immutadora
    const sorted = [...expenses].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateB - dateA;
      if (typeof a.id === 'number' && typeof b.id === 'number') return b.id - a.id;
      return String(b.id).localeCompare(String(a.id));
    });

    // 2. Si no hi ha filtres, retornem ràpid
    if (!q && !isCategoryFilterActive) {
      return sorted; 
    }
    
    // 3. Apliquem filtres fent servir el diccionari per a la cerca de text
    return sorted.filter(e => {
        if (isCategoryFilterActive && e.category !== filterCategory) {
            return false;
        }

        if (q) {
            const searchStr = searchIndexMap.get(e.id);
            if (!searchStr || !searchStr.includes(q)) return false;
        }

        return true;
      });
  }, [expenses, debouncedQuery, filterCategory, searchIndexMap]);

  const balances = useMemo(() => {
    return billingService.calculateBalances(expenses, users);
  }, [users, expenses]);

  const categoryStats = useMemo(() => {
    return billingService.calculateCategoryStats(expenses);
  }, [expenses]);

  const settlements = useMemo(() => {
    return billingService.calculateSettlements(balances);
  }, [balances]);

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
    displayedTotal,
    isSearching 
  };
}