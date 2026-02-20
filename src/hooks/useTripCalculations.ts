// src/hooks/useTripCalculations.ts

import { useState, useEffect, useMemo } from 'react';
import type { Expense, TripUser, MoneyCents } from '../types';
import * as billingService from '../services/billingService';
import { toCents } from '../types'; // [RISC ZERO]: Necessitem el toCents per l'estat inicial

interface CalculationsResult {
  filteredExpenses: Expense[];
  balances: ReturnType<typeof billingService.calculateBalances>;
  categoryStats: ReturnType<typeof billingService.calculateCategoryStats>;
  settlements: ReturnType<typeof billingService.calculateSettlements>;
  totalGroupSpending: MoneyCents;
  displayedTotal: MoneyCents;
  isSearching: boolean; 
  isCalculating: boolean; // [NOU]: Per mostrar petits spinners a la UI si volem
}

export function useTripCalculations(
  expenses: Expense[], 
  users: TripUser[], 
  searchQuery: string, 
  filterCategory: string
): CalculationsResult {
  
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [isSearching, setIsSearching] = useState(false);

  // [NOU]: Estat independent per retenir els valors asíncrons sense blanquejar la pantalla
  const [calcState, setCalcState] = useState({
    balances: [] as ReturnType<typeof billingService.calculateBalances>,
    categoryStats: [] as ReturnType<typeof billingService.calculateCategoryStats>,
    settlements: [] as ReturnType<typeof billingService.calculateSettlements>,
    totalGroupSpending: toCents(0),
    isCalculating: true
  });

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

  // [NOU] El Total Mostrat segueix sent síncron perquè depèn dels filtres (és molt ràpid)
  const displayedTotal = useMemo(() => 
    billingService.calculateTotalSpending(filteredExpenses), 
  [filteredExpenses]);

  // [RISC ZERO]: Treiem el pes pesant del Main Thread.
  useEffect(() => {
    // 1. Marquem que estem calculant (permet posar estats de càrrega a la UI)
    // però CONSERVEM les dades anteriors perquè la gràfica no parpellegi.
    setCalcState(prev => ({ ...prev, isCalculating: true }));

    // 2. Cedim el control a React perquè renderitzi el frame actual (ex: l'animació d'afegir despesa)
    const workerTimer = setTimeout(() => {
      const balances = billingService.calculateBalances(expenses, users);
      const categoryStats = billingService.calculateCategoryStats(expenses);
      const settlements = billingService.calculateSettlements(balances);
      const totalGroupSpending = billingService.calculateTotalSpending(expenses);

      // 3. Actualitzem amb les noves dades
      setCalcState({
        balances,
        categoryStats,
        settlements,
        totalGroupSpending,
        isCalculating: false
      });
    }, 0); // Un timeout de 0 mou l'execució al final de la cua d'events (Event Loop)

    return () => clearTimeout(workerTimer);
  }, [expenses, users]); // Només es recalcula si canvien de veritat les dades, no els filtres.

  // [RISC ZERO]: Retornem l'objecte amb la mateixa signatura que l'antic Hook
  return { 
    filteredExpenses,
    balances: calcState.balances, 
    categoryStats: calcState.categoryStats, 
    settlements: calcState.settlements, 
    totalGroupSpending: calcState.totalGroupSpending, 
    displayedTotal,
    isSearching,
    isCalculating: calcState.isCalculating
  };
}