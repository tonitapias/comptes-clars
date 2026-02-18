import { describe, it, expect } from 'vitest';
import { calculateBalances, calculateSettlements,} from './billingService';
import { TripUser, Expense, toCents, CategoryId } from '../types';

// --- HELPERS PER ALS TESTS ---
// Creem dades falses (mocks) per no dependre de la base de dades
const mockUser = (id: string, name: string): TripUser => ({
  id, name, isAuth: true
});

const mockExpense = (
  id: string, 
  amount: number, 
  payer: string, 
  involved: string[], 
  splitType: 'equal' | 'exact' | 'shares' = 'equal'
): Expense => ({
  id,
  title: 'Test Expense',
  amount: toCents(amount),
  payer,
  involved,
  category: 'food' as CategoryId,
  date: new Date().toISOString(),
  splitType,
  splitDetails: {}
});

describe('Billing Service (Core Logic)', () => {
  const users = [
    mockUser('u1', 'Alice'),
    mockUser('u2', 'Bob'),
    mockUser('u3', 'Charlie')
  ];

  describe('calculateBalances', () => {
    it('should split a simple even amount equally', () => {
      // 30€ pagats per Alice, dividit entre Alice, Bob, Charlie (10€ cadascú)
      // Alice paga 30, en deu 10 -> Balanç +20
      // Bob paga 0, en deu 10 -> Balanç -10
      // Charlie paga 0, en deu 10 -> Balanç -10
      const expenses = [
        mockExpense('e1', 3000, 'u1', ['u1', 'u2', 'u3'])
      ];

      const balances = calculateBalances(expenses, users);
      
      const alice = balances.find(b => b.userId === 'u1');
      const bob = balances.find(b => b.userId === 'u2');

      expect(alice?.amount).toBe(2000); // +20.00€
      expect(bob?.amount).toBe(-1000);  // -10.00€
    });

    it('should handle the "Penny Problem" (10€ / 3) deterministically', () => {
      // 10€ (1000 cents) / 3 = 333.333...
      // Algú ha de pagar 334 cèntims i els altres 333.
      // El total ha de quadrar a 0.
      const expenses = [
        mockExpense('e2', 1000, 'u1', ['u1', 'u2', 'u3'])
      ];

      const balances = calculateBalances(expenses, users);
      const totalBalance = balances.reduce((acc, b) => acc + (b.amount as number), 0);

      expect(totalBalance).toBe(0); // La suma de balanços SEMPRE ha de ser 0
      
      // Verifiquem que els deutes tenen sentit
      const debtorAmounts = balances.filter(b => b.amount < 0).map(b => b.amount);
      // Hauríem de tenir dos deutes al voltant de -3.33€
      expect(debtorAmounts.every(a => a === -333 || a === -334)).toBe(true);
    });

    it('should ignore users not involved in the expense', () => {
      // Alice paga 10€, només per a Bob (Charlie no hi pinta res)
      const expenses = [
        mockExpense('e3', 1000, 'u1', ['u2']) 
      ];

      const balances = calculateBalances(expenses, users);
      const charlie = balances.find(b => b.userId === 'u3');

      expect(charlie?.amount).toBe(0); // Charlie ha de tenir 0
    });
  });

  describe('calculateSettlements', () => {
    it('should generate minimal transactions to settle debts', () => {
      // Escenari:
      // Alice: +20
      // Bob: -10
      // Charlie: -10
      // Solució òptima: Bob paga 10 a Alice, Charlie paga 10 a Alice.
      const balances = [
        { userId: 'u1', amount: toCents(2000) },
        { userId: 'u2', amount: toCents(-1000) },
        { userId: 'u3', amount: toCents(-1000) }
      ];

      const settlements = calculateSettlements(balances);

      expect(settlements).toHaveLength(2);
      expect(settlements).toEqual(expect.arrayContaining([
        expect.objectContaining({ from: 'u2', to: 'u1', amount: 1000 }),
        expect.objectContaining({ from: 'u3', to: 'u1', amount: 1000 })
      ]));
    });

    it('should handle complex chain debts', () => {
      // Alice: +10
      // Bob: +10
      // Charlie: -20
      // Charlie hauria de pagar a Alice i Bob
      const balances = [
        { userId: 'u1', amount: toCents(1000) },
        { userId: 'u2', amount: toCents(1000) },
        { userId: 'u3', amount: toCents(-2000) }
      ];

      const settlements = calculateSettlements(balances);
      
      // Verifiquem que el total liquidat és correcte (20€)
      const totalSettled = settlements.reduce((acc, s) => acc + (s.amount as number), 0);
      expect(totalSettled).toBe(2000);
      expect(settlements[0].from).toBe('u3'); // Charlie és l'únic pagador
    });
  });
});