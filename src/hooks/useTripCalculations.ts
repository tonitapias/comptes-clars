import { useMemo } from 'react';
import { CATEGORIES } from '../utils/constants';
import type { Expense, Balance, Settlement, CategoryStat, TripUser } from '../types';

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
  users: TripUser[], // Ara rep objectes complets
  searchQuery: string, 
  filterCategory: string
): CalculationsResult {
  
  // Helpers per buscar noms ràpidament si calgués (encara que aquí treballem amb IDs)
  // const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Desconegut';

  // 1. Filtrar i Ordenar
  const filteredExpenses = useMemo(() => {
    const q = searchQuery.toLowerCase();
    
    return expenses.filter(e => {
        // Busquem els noms corresponents als IDs per fer la cerca de text
        const payerName = users.find(u => u.id === e.payer)?.name.toLowerCase() || '';
        const involvedNames = e.involved.map(id => users.find(u => u.id === id)?.name.toLowerCase() || '');

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

  // 2. Balanços
  const balances = useMemo(() => {
    const balanceMap: Record<string, number> = {}; 
    // Inicialitzem a 0 per ID
    users.forEach(u => balanceMap[u.id] = 0);
    
    expenses.forEach(exp => {
      // 1. El pagador "posa" els diners
      if (balanceMap[exp.payer] !== undefined) {
          balanceMap[exp.payer] += exp.amount;
      }
      
      const splitType = exp.splitType || 'equal';
      
      // 2. Restem a qui li toca pagar
      if (splitType === 'equal') {
          // Si involved està buit, vol dir TOTS els usuaris
          let receiversIds = exp.involved?.length > 0 ? exp.involved : users.map(u => u.id);
          
          // MILLORA: Ordenem els IDs per garantir determinisme en el repartiment de cèntims
          receiversIds = [...receiversIds].sort();

          const count = receiversIds.length;
          
          if (count > 0) {
              const baseAmount = Math.floor(exp.amount / count);
              const remainder = exp.amount % count;

              receiversIds.forEach((uid, index) => {
                 // Els primers 'remainder' usuaris paguen 1 cèntim més
                 const amountToPay = baseAmount + (index < remainder ? 1 : 0);
                 if (balanceMap[uid] !== undefined) {
                     balanceMap[uid] -= amountToPay;
                 }
              });
          }

      } else if (splitType === 'exact') {
          const details = exp.splitDetails || {};
          Object.entries(details).forEach(([uid, amount]) => {
              if (balanceMap[uid] !== undefined) {
                  balanceMap[uid] -= amount;
              }
          });

      } else if (splitType === 'shares') {
          const details = exp.splitDetails || {};
          const totalShares = Object.values(details).reduce((acc, curr) => acc + curr, 0);
          
          if (totalShares > 0) {
              const amountPerShare = exp.amount / totalShares;
              let distributed = 0;
              const involvedUsersIds = Object.keys(details).sort(); // Ordenem també aquí
              
              involvedUsersIds.forEach((uid, index) => {
                  if (balanceMap[uid] !== undefined) {
                      const shares = details[uid];
                      let amountToPay;

                      if (index === involvedUsersIds.length - 1) {
                          amountToPay = exp.amount - distributed;
                      } else {
                          amountToPay = Math.floor(shares * amountPerShare);
                      }
                      
                      balanceMap[uid] -= amountToPay;
                      distributed += amountToPay;
                  }
              });
          }
      }
    });
    
    // Retornem array mapejat: { userId: "...", amount: ... }
    return Object.entries(balanceMap)
        .map(([userId, amount]) => ({ userId, amount }))
        .sort((a, b) => b.amount - a.amount);

  }, [users, expenses]);

  // 3. Estadístiques
  const categoryStats = useMemo(() => {
    // (Aquesta part no canvia gaire, ja que les categories no depenen dels usuaris)
    const stats: Record<string, number> = {};
    const validExpenses = expenses.filter(e => e.category !== 'transfer');
    const total = validExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    
    if (total === 0) return [];
    
    validExpenses.forEach(exp => {
      const catKey = exp.category || 'other';
      if (!stats[catKey]) stats[catKey] = 0;
      stats[catKey] += exp.amount;
    });
    
    return Object.entries(stats).map(([id, amount]) => {
      const catInfo = CATEGORIES.find(c => c.id === id) || CATEGORIES.find(c => c.id === 'other') || CATEGORIES[0];
      return { 
        id: catInfo.id, amount, label: catInfo.label, icon: catInfo.icon,
        color: catInfo.color, barColor: catInfo.barColor, percentage: (amount / total) * 100 
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  // 4. Liquidacions
  const settlements = useMemo(() => {
    const debts: Settlement[] = [];
    // Copiem i ordenem
    const debtors = balances.filter(b => b.amount < -1).sort((a, b) => a.amount - b.amount); 
    const creditors = balances.filter(b => b.amount > 1).sort((a, b) => b.amount - a.amount);
    
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i]; 
      const creditor = creditors[j];
      
      const amount = Math.min(Math.abs(debtor.amount), creditor.amount);
      
      // Ara 'from' i 'to' són IDs
      debts.push({ from: debtor.userId, to: creditor.userId, amount });
      
      debtor.amount += amount; 
      creditor.amount -= amount;
      
      if (Math.abs(debtor.amount) < 1) i++; 
      if (creditor.amount < 1) j++;
    }
    return debts;
  }, [balances]);

  const totalGroupSpending = expenses.filter(e => e.category !== 'transfer').reduce((acc, curr) => acc + curr.amount, 0);
  const displayedTotal = filteredExpenses.filter(e => e.category !== 'transfer').reduce((acc, curr) => acc + curr.amount, 0);

  return { filteredExpenses, balances, categoryStats, settlements, totalGroupSpending, displayedTotal };
}