import { useEffect } from 'react';
import { TripData, Expense, TripUser } from '../types';
import { TripService } from '../services/tripService';

export function useTripMigration(tripId: string | undefined, tripData: TripData | null) {
  useEffect(() => {
    if (!tripData || !tripId) return;

    const performMigration = async () => {
      let needsUpdate = false;
      let newUsers = [...tripData.users];
      let newExpenses = [...tripData.expenses];

      // 1. Migració d'Usuaris (String -> Objecte)
      if (newUsers.length > 0 && typeof newUsers[0] === 'string') {
        // @ts-ignore
        newUsers = newUsers.map((name: any) => ({
          id: crypto.randomUUID(),
          name: name,
          isDeleted: false
        }));
        needsUpdate = true;
      }

      // 2. Reparació de Despeses (Noms -> IDs)
      const userIds = newUsers.map(u => u.id);
      const hasBrokenExpenses = newExpenses.some(exp => !userIds.includes(exp.payer));

      if (hasBrokenExpenses) {
        needsUpdate = true;
        newExpenses = newExpenses.map(exp => {
          const payerUser = newUsers.find(u => u.name === exp.payer);
          
          const newInvolved = exp.involved.map(invVal => {
            const invUser = newUsers.find(u => u.name === invVal);
            return invUser ? invUser.id : invVal;
          });

          let newSplitDetails = {};
          if (exp.splitDetails) {
            newSplitDetails = Object.fromEntries(Object.entries(exp.splitDetails).map(([key, val]) => {
              const u = newUsers.find(user => user.name === key);
              return [u ? u.id : key, val];
            }));
          }

          return {
            ...exp,
            payer: payerUser ? payerUser.id : exp.payer,
            involved: newInvolved,
            splitDetails: newSplitDetails
          };
        });
      }

      if (needsUpdate) {
        console.log("🛠️ Reparació automàtica de dades antigues executada.");
        try {
          // @ts-ignore - Forcem el tipat per la migració
          await TripService.updateTrip(tripId, { users: newUsers, expenses: newExpenses });
          window.location.reload();
        } catch (e) {
          console.error("Error en la migració automàtica", e);
        }
      }
    };

    performMigration();
  }, [tripData, tripId]);
}