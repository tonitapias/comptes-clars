import { describe, it, expect } from 'vitest';
import { calculateBalances, calculateSettlements,} from './billingService';
import { TripUser, Expense, toCents, CategoryId } from '../types';

// --- HELPERS PER ALS TESTS ---
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

  // ==========================================================
  // SECCIÓ 1: CÀLCUL DE BALANÇOS
  // ==========================================================
  describe('calculateBalances', () => {
    
    // --- Tests Originals ---
    it('should split a simple even amount equally', () => {
      const expenses = [mockExpense('e1', 3000, 'u1', ['u1', 'u2', 'u3'])];
      const balances = calculateBalances(expenses, users);
      expect(balances.find(b => b.userId === 'u1')?.amount).toBe(2000); 
      expect(balances.find(b => b.userId === 'u2')?.amount).toBe(-1000);  
    });

    it('should handle the "Penny Problem" (10€ / 3) deterministically', () => {
      const expenses = [mockExpense('e2', 1000, 'u1', ['u1', 'u2', 'u3'])];
      const balances = calculateBalances(expenses, users);
      const totalBalance = balances.reduce((acc, b) => acc + (b.amount as number), 0);
      expect(totalBalance).toBe(0); 
      
      const debtorAmounts = balances.filter(b => b.amount < 0).map(b => b.amount);
      expect(debtorAmounts.every(a => a === -333 || a === -334)).toBe(true);
    });

    it('should ignore users not involved in the expense', () => {
      const expenses = [mockExpense('e3', 1000, 'u1', ['u2'])];
      const balances = calculateBalances(expenses, users);
      expect(balances.find(b => b.userId === 'u3')?.amount).toBe(0); 
    });

    it('should calculate exact splits correctly and absorb remainders', () => {
      const expenses = [
        {
          ...mockExpense('e-exact', 5000, 'u1', [], 'exact'),
          splitDetails: { 'u2': toCents(2000), 'u3': toCents(2500) }
        }
      ];
      const balances = calculateBalances(expenses, users);
      expect(balances.find(b => b.userId === 'u1')?.amount).toBe(4500); 
      expect(balances.find(b => b.userId === 'u2')?.amount).toBe(-2000);
      expect(balances.find(b => b.userId === 'u3')?.amount).toBe(-2500);
    });

    it('should split by shares securely handling decimal points in percentages', () => {
      const expenses = [
        {
          ...mockExpense('e-shares', 10000, 'u2', [], 'shares'),
          splitDetails: { 'u1': toCents(1), 'u2': toCents(2), 'u3': toCents(3) } 
        }
      ];
      const balances = calculateBalances(expenses, users);
      expect(balances.find(b => b.userId === 'u3')?.amount).toBe(-5000); 
      expect(balances.find(b => b.userId === 'u2')?.amount).toBe(6667); 
      expect(balances.find(b => b.userId === 'u1')?.amount).toBe(-1667);
    });

    it('should handle negative expenses (refunds) perfectly without losing cents', () => {
      const expenses = [mockExpense('e-refund', -1000, 'u1', ['u1', 'u2', 'u3'])];
      const balances = calculateBalances(expenses, users);
      
      const totalBalance = balances.reduce((acc, b) => acc + (b.amount as number), 0);
      expect(totalBalance).toBe(0); 
      
      const receiverAmounts = balances.filter(b => b.userId !== 'u1').map(b => b.amount); 
      expect(receiverAmounts.every(a => a === 333 || a === 334)).toBe(true);
    });

    // --- NOUS TESTS DE BALANÇOS (Moguts aquí perquè tinguin sentit semàntic) ---
    it('should correctly accumulate balances from multiple expenses', () => {
      const expenses = [
        mockExpense('e1', 3000, 'u1', ['u1', 'u2', 'u3']), // u1 paga 30€ (Tots 3)
        mockExpense('e2', 6000, 'u2', ['u1', 'u2']),       // u2 paga 60€ (Només u1 i u2)
      ];
      const balances = calculateBalances(expenses, users);
      
      // u1: paga 30, gasta 10 (e1) + gasta 30 (e2) = -10€ (-1000 cents)
      expect(balances.find(b => b.userId === 'u1')?.amount).toBe(-1000);
      // u2: paga 60, gasta 10 (e1) + gasta 30 (e2) = +20€ (+2000 cents)
      expect(balances.find(b => b.userId === 'u2')?.amount).toBe(2000);
      // u3: gasta 10 (e1) = -10€ (-1000 cents)
      expect(balances.find(b => b.userId === 'u3')?.amount).toBe(-1000);
    });

    it('should handle a payer who is not involved in the expense', () => {
      const expenses = [mockExpense('e3', 2000, 'u1', ['u2', 'u3'])]; // u1 paga, però només u2 i u3 participen
      const balances = calculateBalances(expenses, users);
      
      expect(balances.find(b => b.userId === 'u1')?.amount).toBe(2000);  // u1 rep el 100%
      expect(balances.find(b => b.userId === 'u2')?.amount).toBe(-1000); // u2 paga la meitat
      expect(balances.find(b => b.userId === 'u3')?.amount).toBe(-1000); // u3 paga la meitat
    });

    it('should return 0 balances when there are no expenses', () => {
      const balances = calculateBalances([], users);
      expect(balances.every(b => b.amount === 0)).toBe(true);
    });
  });

  // ==========================================================
  // SECCIÓ 2: CÀLCUL DE LIQUIDACIONS (DEUTES)
  // ==========================================================
  describe('calculateSettlements', () => {
    
    it('should generate minimal transactions to settle debts', () => {
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

    it('should return empty array if all balances are exactly 0', () => {
      const balances = [
        { userId: 'u1', amount: toCents(0) },
        { userId: 'u2', amount: toCents(0) },
      ];
      const settlements = calculateSettlements(balances);
      expect(settlements).toHaveLength(0);
    });

    it('should handle micro-cents remnants without infinite loops', () => {
      // A vegades, depenent dels arrodoniments, pot quedar +1 cèntim orfe
      const balances = [
        { userId: 'u1', amount: toCents(1000) },
        { userId: 'u2', amount: toCents(-500) },
        { userId: 'u3', amount: toCents(-499) } 
      ];
      
      const settlements = calculateSettlements(balances);
      expect(settlements).toHaveLength(2);
      // Ens assegurem que les liquidacions sumen exactament els deutes negatius (999)
      const totalSettled = settlements.reduce((acc, s) => acc + (s.amount as number), 0);
      expect(totalSettled).toBe(999);
    });

    it('should handle complex chain debts', () => {
      const balances = [
        { userId: 'u1', amount: toCents(1000) },
        { userId: 'u2', amount: toCents(1000) },
        { userId: 'u3', amount: toCents(-2000) }
      ];

      const settlements = calculateSettlements(balances);
      const totalSettled = settlements.reduce((acc, s) => acc + (s.amount as number), 0);
      
      expect(totalSettled).toBe(2000);
      expect(settlements[0].from).toBe('u3'); 
    });
  });
});