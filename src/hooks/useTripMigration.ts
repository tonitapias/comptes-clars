import { useEffect } from 'react';
import { TripData, Expense, TripUser } from '../types';
import { TripService } from '../services/tripService';

export function useTripMigration(tripId: string | undefined, tripData: TripData | null) {
  useEffect(() => {
    if (!tripData || !tripId) return;

    const performMigration = async () => {
      let needsUpdate = false;
      
      // CORRECCIÓ 1: Tractem les dades entrants com a 'unknown' per permetre la comprovació de tipus
      // això ens permet detectar si són strings sense que TS es queixi que és "impossible".
      const rawUsers = tripData.users as unknown as (TripUser | string)[];
      let newUsers: TripUser[] = [];

      // 1. Migració d'Usuaris (String -> Objecte)
      // Ara TS entén que rawUsers[0] POT ser un string gràcies al cast anterior
      if (rawUsers.length > 0 && typeof rawUsers[0] === 'string') {
        newUsers = (rawUsers as string[]).map((name) => ({
          id: crypto.randomUUID(),
          name: name,
          isDeleted: false
        }));
        needsUpdate = true;
      } else {
        // Si no són strings, assumim que ja són TripUser[] correctes
        newUsers = [...tripData.users];
      }

      // 2. Reparació de Despeses (Noms -> IDs)
      let newExpenses: Expense[] = [...tripData.expenses];
      const userIds = newUsers.map(u => u.id);
      
      // Comprovem si hi ha despeses on el 'payer' no és un ID vàlid (probablement és un nom antic)
      const hasBrokenExpenses = newExpenses.some(exp => !userIds.includes(exp.payer));

      if (hasBrokenExpenses) {
        needsUpdate = true;
        newExpenses = newExpenses.map(exp => {
          // Intentem trobar l'usuari pel nom (cas dades antigues)
          const payerUser = newUsers.find(u => u.name === exp.payer);
          
          const newInvolved = exp.involved.map(invVal => {
            const invUser = newUsers.find(u => u.name === invVal);
            return invUser ? invUser.id : invVal;
          });

          // CORRECCIÓ 2: Tipat correcte per a l'acumulador de splitDetails
          // Usem 'any' controlat o el tipus de splitDetails de l'Expense per evitar errors d'indexació
          let newSplitDetails: Record<string, number> = {}; 
          
          if (exp.splitDetails) {
            newSplitDetails = Object.fromEntries(
              Object.entries(exp.splitDetails).map(([key, val]) => {
                const u = newUsers.find(user => user.name === key);
                return [u ? u.id : key, val];
              })
            );
          }

          return {
            ...exp,
            payer: payerUser ? payerUser.id : exp.payer,
            involved: newInvolved,
            // Cast necessari per complir amb la interfície estricta de Expense (Record<UserId, MoneyCents>)
            splitDetails: newSplitDetails as Expense['splitDetails']
          };
        });
      }

      if (needsUpdate) {
        console.log("🛠️ Reparació automàtica de dades antigues executada.");
        try {
          // CORRECCIÓ 3: Eliminat @ts-ignore. 
          // Passem un objecte parcial que compleix amb el que updateTrip sol esperar (Partial<TripData>)
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