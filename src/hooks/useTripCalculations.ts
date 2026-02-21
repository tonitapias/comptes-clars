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
  isCalculating: boolean; 
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
    const q = debouncedQuery.toLowerCase().trim();
    const isCategoryFilterActive = filterCategory !== 'all';

    const sorted = [...expenses].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateB - dateA;
      if (typeof a.id === 'number' && typeof b.id === 'number') return b.id - a.id;
      return String(b.id).localeCompare(String(a.id));
    });

    if (!q && !isCategoryFilterActive) return sorted; 
    
    return sorted.filter(e => {
        if (isCategoryFilterActive && e.category !== filterCategory) return false;
        if (q) {
            const searchStr = searchIndexMap.get(e.id);
            if (!searchStr || !searchStr.includes(q)) return false;
        }
        return true;
      });
  }, [expenses, debouncedQuery, filterCategory, searchIndexMap]);

  const displayedTotal = useMemo(() => 
    billingService.calculateTotalSpending(filteredExpenses), 
  [filteredExpenses]);

  // [RISC ZERO]: Eliminem el useState i useEffect asíncron que causaven el bucle.
  // Utilitzem useMemo per calcular les dades derivades de forma síncrona, segura i òptima.
  const balances = useMemo(() => billingService.calculateBalances(expenses, users), [expenses, users]);
  const categoryStats = useMemo(() => billingService.calculateCategoryStats(expenses), [expenses]);
  const settlements = useMemo(() => billingService.calculateSettlements(balances), [balances]);
  const totalGroupSpending = useMemo(() => billingService.calculateTotalSpending(expenses), [expenses]);

  // Retornem l'objecte amb la mateixa signatura que l'antic Hook
  return { 
    filteredExpenses,
    balances, 
    categoryStats, 
    settlements, 
    totalGroupSpending, 
    displayedTotal,
    isSearching,
    isCalculating: false // Ja no hi ha timeout asíncron, els càlculs són immediats
  };
}