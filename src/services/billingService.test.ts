// src/services/billingService.test.ts
import { describe, it, expect } from 'vitest';
import { calculateBalances, SPLIT_TYPES } from './billingService';
// Importem tipus per evitar l'ús de 'any' i tenir autocompletat, tot i que en tests podem ser flexibles
import { Expense, TripUser } from '../types';

describe('billingService', () => {
  it('hauria de repartir una despesa simple equitativament', () => {
    // 1. Setup (Dades de prova)
    const users: Partial<TripUser>[] = [
      { id: 'u1', name: 'A' }, 
      { id: 'u2', name: 'B' }
    ];

    const expenses: Partial<Expense>[] = [{
      id: 'e1', 
      title: 'Sopar', 
      amount: 1000, // 10.00€
      payer: 'u1',
      involved: ['u1', 'u2'], 
      date: '2024-01-01', 
      category: 'food',
      splitType: SPLIT_TYPES.EQUAL
    }];

    // 2. Execució
    // Fem servir 'as' per complir amb TypeScript sense haver de definir tots els camps opcionals en el test
    const balances = calculateBalances(expenses as Expense[], users as TripUser[]);

    // 3. Verificació (Assert)
    // u1 paga 1000, cost total 1000. Són 2 persones (500 cadascú).
    // u1 paga 1000 però en deu 500 -> Balanç +500.
    // u2 no paga res però en deu 500 -> Balanç -500.
    expect(balances).toEqual([
      { userId: 'u1', amount: 500 },
      { userId: 'u2', amount: -500 }
    ]);
  });
});