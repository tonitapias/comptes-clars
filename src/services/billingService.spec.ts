// src/services/billingService.spec.ts

import { describe, it, expect } from 'vitest';
import { 
  calculateBalances, 
  calculateSettlements, 
  resolveUserId, 
  SPLIT_TYPES 
} from './billingService';
import { TripUser, Expense } from '../types';

// --- MOCK DATA ---
const userA: TripUser = { id: 'u1', name: 'Alice', email: 'alice@test.com' };
const userB: TripUser = { id: 'u2', name: 'Bob' }; // Nom coinciden, ID diferent
const userC: TripUser = { id: 'u3', name: 'Charlie' };
const users = [userA, userB, userC];

// Helper per crear despeses ràpidament
const createExpense = (
  payerId: string, 
  amount: number, 
  involved: string[] = [], 
  splitType: string = SPLIT_TYPES.EQUAL,
  splitDetails: Record<string, number> = {}
): Expense => ({
  id: 'exp1',
  title: 'Test Expense',
  category: 'food',
  date: new Date().toISOString(),
  payer: payerId,
  amount,
  involved,
  splitType: splitType as any,
  splitDetails
});

describe('BillingService (Core Security Audit)', () => {

  // -------------------------------------------------------------------------
  // 1. TEST DE SEGURETAT D'IDENTITAT (CRÍTIC)
  // -------------------------------------------------------------------------
  describe('Identity Resolution (Strict Mode)', () => {
    it('hauria de resoldre un usuari pel seu ID exacte', () => {
      expect(resolveUserId('u1', users)).toBe('u1');
    });

    it('NO hauria de resoldre un usuari pel seu nom (Prevenir spoofing)', () => {
      // Abans això tornava 'u1', ara ha de tornar undefined.
      // Això protegeix contra usuaris que es posen el nom d'altres.
      expect(resolveUserId('Alice', users)).toBeUndefined();
    });

    it('hauria de retornar undefined per a IDs inexistents', () => {
      expect(resolveUserId('ghost_user', users)).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 2. TEST D'INTEGRITAT FINANCERA (SUMA ZERO)
  // -------------------------------------------------------------------------
  describe('Calculate Balances (Zero-Sum Integrity)', () => {
    
    it('Suma Zero: Repartiment simple (Equal)', () => {
      // 30€ pagats per A, entre A, B, C.
      // Cadascú deu 10€. A ha pagat 30.
      // Balanç esperat: A: +20, B: -10, C: -10.
      const expense = createExpense('u1', 3000, ['u1', 'u2', 'u3']);
      const balances = calculateBalances([expense], users);

      const sum = balances.reduce((acc, b) => acc + b.amount, 0);
      expect(sum).toBe(0); // Invariant universal

      const balanceA = balances.find(b => b.userId === 'u1')?.amount;
      const balanceB = balances.find(b => b.userId === 'u2')?.amount;
      
      expect(balanceA).toBe(2000);
      expect(balanceB).toBe(-1000);
    });

    it('Suma Zero: Gestió de residus (Cèntims)', () => {
      // 100€ entre 3 persones = 33.3333...
      const expense = createExpense('u1', 10000, ['u1', 'u2', 'u3']);
      const balances = calculateBalances([expense], users);
      
      const sum = balances.reduce((acc, b) => acc + b.amount, 0);
      expect(sum).toBe(0);

      // Verifiquem que no s'ha perdut cap cèntim
      const debtorAmounts = balances.filter(b => b.amount < 0).map(b => b.amount);
      const totalDebt = debtorAmounts.reduce((a, b) => a + b, 0);
      
      // EXPLICACIÓ CORREGIDA:
      // Com que 'u1' és el primer per ordre alfabètic, rep el cèntim extra de cost (3334).
      // Al ser també el pagador, això redueix el que els altres li deuen.
      // B (3333) + C (3333) = 6666.
      expect(Math.abs(totalDebt)).toBe(6666); 
    });

    it('Seguretat: Ignora usuaris involucrats que no existeixen (Zombie users)', () => {
      // B i un fantasma. Només B hauria de rebre el càrrec.
      const expense = createExpense('u1', 1000, ['u2', 'ghost_user']);
      const balances = calculateBalances([expense], users);

      const balanceGhost = balances.find(b => b.userId === 'ghost_user');
      expect(balanceGhost).toBeUndefined(); // No s'ha de crear entrada

      const balanceB = balances.find(b => b.userId === 'u2')?.amount;
      expect(balanceB).toBe(-1000); // B paga tot el que s'ha pogut assignar
    });
  });

  // -------------------------------------------------------------------------
  // 3. TEST DE FLEXIBILITAT (UX MILLORADA)
  // -------------------------------------------------------------------------
  describe('Exact Split (Flexible Mode)', () => {
    it('permet repartir MENYS del total (residu absorbit pel pagador)', () => {
      // Factura de 50€, però només assignem 20€ a B.
      // La resta (30€) es considera despesa pròpia de A.
      // A paga 50. B li deu 20. Balanç final: A +20, B -20.
      const expense = createExpense('u1', 5000, [], SPLIT_TYPES.EXACT, {
        'u2': 2000 
      });

      const balances = calculateBalances([expense], users);
      
      const balanceA = balances.find(b => b.userId === 'u1')?.amount;
      const balanceB = balances.find(b => b.userId === 'u2')?.amount;

      expect(balanceA).toBe(2000); 
      expect(balanceB).toBe(-2000);
      
      // Invariant segueix sent 0
      expect(balances.reduce((a, b) => a + b.amount, 0)).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 4. TEST DE LIQUIDACIONS (SETTLEMENTS)
  // -------------------------------------------------------------------------
  describe('Calculate Settlements (Debt Minimization)', () => {
    it('resol deutes simples directament', () => {
      // A: +10, B: -10
      const balances = [
        { userId: 'u1', amount: 1000 },
        { userId: 'u2', amount: -1000 }
      ];
      const settlements = calculateSettlements(balances);
      
      expect(settlements).toHaveLength(1);
      expect(settlements[0]).toEqual({ from: 'u2', to: 'u1', amount: 1000 });
    });

    it('ignora deutes insignificants (soroll de float o < 1 cèntim)', () => {
      // Deute de 0.5 cèntims (no hauria de passar amb enters, però per seguretat)
      const balances = [
        { userId: 'u1', amount: 0.5 },
        { userId: 'u2', amount: -0.5 }
      ];
      const settlements = calculateSettlements(balances);
      expect(settlements).toHaveLength(0);
    });

    it('resol escenaris complexos multipersona', () => {
      // A deu 100, B deu 50. C espera rebre 150.
      const balances = [
        { userId: 'u1', amount: -10000 }, // A
        { userId: 'u2', amount: -5000 },  // B
        { userId: 'u3', amount: 15000 }   // C
      ];
      
      const settlements = calculateSettlements(balances);
      
      // Hauria de generar: A->C (100) i B->C (50)
      expect(settlements).toHaveLength(2);
      const paymentFromA = settlements.find(s => s.from === 'u1');
      const paymentFromB = settlements.find(s => s.from === 'u2');
      
      expect(paymentFromA?.to).toBe('u3');
      expect(paymentFromA?.amount).toBe(10000);
      
      expect(paymentFromB?.to).toBe('u3');
      expect(paymentFromB?.amount).toBe(5000);
    });
  });
});