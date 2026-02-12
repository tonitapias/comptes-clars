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
  isSearching: boolean; // Nou flag per indicar estat de càrrega a la UI
}

export function useTripCalculations(
  expenses: Expense[], 
  users: TripUser[], 
  searchQuery: string, 
  filterCategory: string
): CalculationsResult {
  
  // 1. Debounce de la cerca
  // Evitem que el filtratge s'executi a cada tecla premuda.
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // Si la query està buida, actualitzem immediatament per esborrar ràpid
    if (!searchQuery) {
      setDebouncedQuery('');
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setIsSearching(false);
    }, 300); // 300ms de retard (estàndard UX)

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 2. Creem un índex de noms d'usuaris (ID -> Nom)
  const userSearchIndex = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach(u => {
      const nameKey = u.name.toLowerCase();
      map[u.id] = nameKey;
    });
    return map;
  }, [users]);

  // 3. Optimització: Pre-càlcul de strings de cerca (Indexing)
  // En lloc de buscar noms dins del bucle de filtre, preparem les dades abans.
  // Això converteix el filtre de complexitat O(N*M) a O(N).
  const searchableExpenses = useMemo(() => {
    // Primer ordenem (lògica original preservada)
    const sorted = [...expenses].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateB - dateA;
      if (typeof a.id === 'number' && typeof b.id === 'number') return b.id - a.id;
      return String(b.id).localeCompare(String(a.id));
    });

    // Després adjuntem l'string de cerca pre-calculat
    return sorted.map(e => {
      const payerName = userSearchIndex[e.payer] || '';
      const involvedNames = e.involved
        .map(uid => userSearchIndex[uid] || '')
        .join(' ');
      
      // Creem un "super string" amb tot el contingut cercable normalitzat
      const searchString = `${e.title} ${payerName} ${involvedNames}`.toLowerCase();
      
      return { ...e, _searchString: searchString };
    });
  }, [expenses, userSearchIndex]);

  // 4. Filtratge Eficient
  const filteredExpenses = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    const isCategoryFilterActive = filterCategory !== 'all';

    if (!q && !isCategoryFilterActive) {
      return searchableExpenses; // Retornem directament (sense camps extra visibles)
    }
    
    return searchableExpenses.filter(e => {
        // Filtre Categoria (Ràpid)
        if (isCategoryFilterActive && e.category !== filterCategory) {
            return false;
        }

        // Filtre Text (Ara ultra-ràpid gràcies a l'índex)
        if (q && !e._searchString.includes(q)) {
            return false;
        }

        return true;
      });
  }, [searchableExpenses, debouncedQuery, filterCategory]);

  // 5. Càlculs Pesats (Balanços i Liquidacions)
  // Aquests depenen de les despeses TOTALS, no de les filtrades.
  // Es mantenen optimitzats perquè només canvien si expenses/users canvien.
  const balances = useMemo(() => {
    return billingService.calculateBalances(expenses, users);
  }, [users, expenses]);

  const categoryStats = useMemo(() => {
    return billingService.calculateCategoryStats(expenses);
  }, [expenses]);

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
    filteredExpenses, // React ignora la propietat interna '_searchString' al renderitzar
    balances, 
    categoryStats, 
    settlements, 
    totalGroupSpending, 
    displayedTotal,
    isSearching 
  };
}