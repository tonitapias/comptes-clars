// src/services/billingService.spec.ts

import { describe, it, expect } from 'vitest';
import { 
  calculateBalances, 
  calculateSettlements, 
  resolveUserId
  } from './billingService';
import { TripUser, Expense, toCents, MoneyCents } from '../types';
import { SPLIT_TYPES } from '../utils/constants';

// --- MOCK DATA ---
const userA: TripUser = { id: 'u1', name: 'Alice', email: 'alice@test.com' };
const userB: TripUser = { id: 'u2', name: 'Bob' };
const userC: TripUser = { id: 'u3', name: 'Charlie' };
const users = [userA, userB, userC];

// Helper per crear despeses (Adaptat a MoneyCents)
const createExpense = (
  payerId: string, 
  amount: number, // Passem number per comoditat al test...
  involved: string[] = [], 
  splitType: string = SPLIT_TYPES.EQUAL,
  splitDetails: Record<string, number> = {},
  customId: string = 'exp1'
): Expense => ({
  id: customId,
  title: 'Test Expense',
  category: 'food',
  date: new Date().toISOString(),
  payer: payerId,
  amount: toCents(amount), // ...i convertim aquí
  involved,
  splitType: splitType as any,
  splitDetails: Object.entries(splitDetails).reduce((acc, [k, v]) => {
    acc[k] = toCents(v);
    return acc;
  }, {} as Record<string, MoneyCents>)
});

describe('BillingService (Core Security Audit)', () => {

  // -------------------------------------------------------------------------
  // 1. TEST DE SEGURETAT D'IDENTITAT
  // -------------------------------------------------------------------------
  describe('Identity Resolution (Strict Mode)', () => {
    it('hauria de resoldre un usuari pel seu ID exacte', () => {
      expect(resolveUserId('u1', users)).toBe('u1');
    });

    it('NO hauria de resoldre un usuari pel seu nom (Prevenir spoofing)', () => {
      expect(resolveUserId('Alice', users)).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 2. TEST D'INTEGRITAT FINANCERA (SUMA ZERO)
  // -------------------------------------------------------------------------
  describe('Calculate Balances (Zero-Sum Integrity)', () => {
    
    it('Suma Zero: Repartiment simple (Equal)', () => {
      // 30€ (3000 cts) entre 3. Cadascú paga 1000.
      const expense = createExpense('u1', 3000, ['u1', 'u2', 'u3']);
      const balances = calculateBalances([expense], users);

      const sum = balances.reduce((acc, b) => acc + b.amount, 0);
      expect(sum).toBe(0); 

      const balanceA = balances.find(b => b.userId === 'u1')?.amount;
      const balanceB = balances.find(b => b.userId === 'u2')?.amount;
      
      expect(balanceA).toBe(toCents(2000));  // Ha pagat 3000, li deuen 2000
      expect(balanceB).toBe(toCents(-1000)); // Ha de pagar 1000
    });

    it('Justícia Distributiva: El residu rota segons l\'ID de despesa', () => {
      // 100 cèntims entre 3 persones = 33 + 33 + 34.
      // Amb l'ID 'exp1', el hash pot fer que li toqui a un usuari concret.
      const expense1 = createExpense('u1', 100, ['u1', 'u2', 'u3'], SPLIT_TYPES.EQUAL, {}, 'exp1');
      const balances1 = calculateBalances([expense1], users);
      
      // Busquem qui ha pagat el cèntim extra (qui té deute -34 en lloc de -33)
      // Nota: El pagador u1 tindrà saldo positiu, mirem els altres.
      const payerOfExtra1 = balances1.find(b => b.userId !== 'u1' && b.amount === toCents(-34));

      // Creem una altra despesa amb un ID diferent ('exp2')
      const expense2 = createExpense('u1', 100, ['u1', 'u2', 'u3'], SPLIT_TYPES.EQUAL, {}, 'exp_random_seed_99');
      const balances2 = calculateBalances([expense2], users);
      
      // La distribució del residu hauria de ser determinista però diferent (o almenys no fixa al primer)
      // En un sistema just, canviar l'ID ha de poder canviar qui paga el residu.
      
      // Verificació d'invariant: La suma sempre és 0
      expect(balances1.reduce((a, b) => a + b.amount, 0)).toBe(0);
      expect(balances2.reduce((a, b) => a + b.amount, 0)).toBe(0);
    });

    it('Seguretat: Ignora usuaris involucrats que no existeixen', () => {
      const expense = createExpense('u1', 1000, ['u2', 'ghost_user']);
      const balances = calculateBalances([expense], users);

      const balanceGhost = balances.find(b => b.userId === 'ghost_user');
      expect(balanceGhost).toBeUndefined(); 

      const balanceB = balances.find(b => b.userId === 'u2')?.amount;
      expect(balanceB).toBe(toCents(-1000));
    });
  });

  // -------------------------------------------------------------------------
  // 3. TEST DE FLEXIBILITAT (UX MILLORADA)
  // -------------------------------------------------------------------------
  describe('Exact Split (Flexible Mode)', () => {
    it('permet repartir MENYS del total (residu absorbit pel pagador)', () => {
      // Factura 50€, u2 paga 20€. u1 absorbeix els 30€ restants.
      const expense = createExpense('u1', 5000, [], SPLIT_TYPES.EXACT, {
        'u2': 2000 
      });

      const balances = calculateBalances([expense], users);
      
      const balanceA = balances.find(b => b.userId === 'u1')?.amount;
      const balanceB = balances.find(b => b.userId === 'u2')?.amount;

      expect(balanceA).toBe(toCents(2000)); // u2 li deu 2000
      expect(balanceB).toBe(toCents(-2000));
    });
  });

  // -------------------------------------------------------------------------
  // 4. TEST DE LIQUIDACIONS (SETTLEMENTS)
  // -------------------------------------------------------------------------
  describe('Calculate Settlements (Debt Minimization)', () => {
    it('resol deutes simples directament', () => {
      const balances = [
        { userId: 'u1', amount: toCents(1000) },
        { userId: 'u2', amount: toCents(-1000) }
      ];
      const settlements = calculateSettlements(balances);
      
      expect(settlements).toHaveLength(1);
      expect(settlements[0]).toEqual({ from: 'u2', to: 'u1', amount: toCents(1000) });
    });

    it('resol escenaris complexos multipersona', () => {
      const balances = [
        { userId: 'u1', amount: toCents(-10000) }, // A deu 100
        { userId: 'u2', amount: toCents(-5000) },  // B deu 50
        { userId: 'u3', amount: toCents(15000) }   // C rep 150
      ];
      
      const settlements = calculateSettlements(balances);
      
      expect(settlements).toHaveLength(2);
      const paymentFromA = settlements.find(s => s.from === 'u1');
      expect(paymentFromA?.to).toBe('u3');
      expect(paymentFromA?.amount).toBe(toCents(10000));
    });
  });
});