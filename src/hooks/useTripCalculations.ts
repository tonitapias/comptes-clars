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
  users: TripUser[], 
  searchQuery: string, 
  filterCategory: string
): CalculationsResult {
  
  // 1. Filtrar i Ordenar
  const filteredExpenses = useMemo(() => {
    const q = searchQuery.toLowerCase();
    
    return expenses.filter(e => {
        // Busquem els noms corresponents als IDs per fer la cerca de text
        // (Intentem fer match tant per ID com si el camp conté el nom directament)
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

  // 2. Balanços
  const balances = useMemo(() => {
    const balanceMap: Record<string, number> = {}; 
    // Inicialitzem a 0 per ID d'usuari real
    users.forEach(u => balanceMap[u.id] = 0);

    // --- FUNCIÓ CLAU: Resol l'ID tant si ve com a ID real o com a Nom (legacy) ---
    const resolveId = (identifier: string): string | undefined => {
        // 1. Si l'identificador ja és una clau vàlida (ID real), el tornem
        if (balanceMap[identifier] !== undefined) return identifier;
        
        // 2. Si no, busquem si hi ha un usuari amb aquest NOM
        const userByName = users.find(u => u.name === identifier);
        // Si trobem l'usuari pel nom i tenim el seu ID al mapa, tornem l'ID
        if (userByName && balanceMap[userByName.id] !== undefined) {
            return userByName.id;
        }
        
        // 3. Usuari no trobat
        return undefined;
    };
    
    expenses.forEach(exp => {
      // 1. El pagador "posa" els diners
      const payerId = resolveId(exp.payer);

      if (payerId) {
          balanceMap[payerId] += exp.amount;
      }
      
      const splitType = exp.splitType || 'equal';
      
      // 2. Restem a qui li toca pagar
      if (splitType === 'equal') {
          // Si involved està buit, vol dir TOTS els usuaris
          let rawInvolved = exp.involved?.length > 0 ? exp.involved : users.map(u => u.id);
          
          // Convertim qualsevol nom antic a ID actual
          let receiversIds = rawInvolved
            .map(id => resolveId(id))
            .filter((id): id is string => id !== undefined);
          
          // Ordenem els IDs per garantir determinisme en el repartiment de cèntims
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
          Object.entries(details).forEach(([identifier, amount]) => {
              const uid = resolveId(identifier);
              if (uid && balanceMap[uid] !== undefined) {
                  balanceMap[uid] -= amount;
              }
          });

      } else if (splitType === 'shares') {
          const details = exp.splitDetails || {};
          const totalShares = Object.values(details).reduce((acc, curr) => acc + curr, 0);
          
          if (totalShares > 0) {
              const amountPerShare = exp.amount / totalShares;
              let distributed = 0;
              
              // Obtenim IDs vàlids de les keys (que poden ser noms)
              const entries = Object.entries(details)
                .map(([key, shares]) => ({ uid: resolveId(key), shares }))
                .filter(entry => entry.uid !== undefined)
                .sort((a, b) => (a.uid! > b.uid! ? 1 : -1)); // Ordenem per ID

              const count = entries.length;
              
              entries.forEach((entry, index) => {
                  if (entry.uid && balanceMap[entry.uid] !== undefined) {
                      let amountToPay;

                      if (index === count - 1) {
                          amountToPay = exp.amount - distributed;
                      } else {
                          amountToPay = Math.floor(entry.shares * amountPerShare);
                      }
                      
                      balanceMap[entry.uid] -= amountToPay;
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
    // Copiem i ordenem (Clonem els objectes balance per no mutar l'original directament si no volem)
    // Però aquí modifiquem 'debtor.amount', així que millor fer map per trencar referència si fos necessari.
    // En aquest cas, 'balances' ve del useMemo anterior i és nou cada cop, així que podem mutar-lo localment dins aquest useMemo
    // sense afectar el renderitzat previ, PERÒ React StrictMode podria queixar-se. 
    // MILLORA: Fem deep copy dels balances per calcular settlements sense tocar l'original.
    const balancesCopy = balances.map(b => ({ ...b }));

    const debtors = balancesCopy.filter(b => b.amount < -0.01).sort((a, b) => a.amount - b.amount); 
    const creditors = balancesCopy.filter(b => b.amount > 0.01).sort((a, b) => b.amount - a.amount);
    
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i]; 
      const creditor = creditors[j];
      
      const amount = Math.min(Math.abs(debtor.amount), creditor.amount);
      
      // Ara 'from' i 'to' són IDs
      debts.push({ from: debtor.userId, to: creditor.userId, amount });
      
      debtor.amount += amount; 
      creditor.amount -= amount;
      
      if (Math.abs(debtor.amount) < 0.01) i++; 
      if (creditor.amount < 0.01) j++;
    }
    return debts;
  }, [balances]);

  const totalGroupSpending = expenses.filter(e => e.category !== 'transfer').reduce((acc, curr) => acc + curr.amount, 0);
  const displayedTotal = filteredExpenses.filter(e => e.category !== 'transfer').reduce((acc, curr) => acc + curr.amount, 0);

  return { filteredExpenses, balances, categoryStats, settlements, totalGroupSpending, displayedTotal };
}