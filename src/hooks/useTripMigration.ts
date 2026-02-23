import { useEffect, useRef } from 'react';
import { doc, getDoc, writeBatch, deleteField } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DB_PATHS } from '../config/dbPaths';
import { TripData, Expense, TripUser } from '../types';
import { TripService } from '../services/tripService';

export function useTripMigration(tripId: string | undefined, tripData: TripData | null) {
  // [MILLORA DE RENDIMENT]: Utilitzem un ref per assegurar-nos que l'script 
  // de neteja només s'executa UNA vegada per cada viatge que obrim.
  const migrationCheckedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!tripData || !tripId) return;
    
    // Si ja hem comprovat la base de dades d'aquest viatge en aquesta sessió, ens ho saltem
    if (migrationCheckedRef.current === tripId) return;
    migrationCheckedRef.current = tripId;

    const performMigration = async () => {
      // ====================================================================
      // 1. MIGRACIÓ DE DADES ESTÈTIQUES (Antic)
      // ====================================================================
      let needsUpdate = false;
      const rawUsers = tripData.users as unknown as (TripUser | string)[];
      let newUsers: TripUser[] = [];

      if (rawUsers.length > 0 && typeof rawUsers[0] === 'string') {
        newUsers = (rawUsers as string[]).map((name) => ({
          id: crypto.randomUUID(),
          name: name,
          isDeleted: false
        }));
        needsUpdate = true;
      } else {
        newUsers = [...tripData.users];
      }

      let newExpenses: Expense[] = [...tripData.expenses];
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
            splitDetails: newSplitDetails as Expense['splitDetails']
          };
        });
      }

      if (needsUpdate) {
        console.log("🛠️ Reparació automàtica de dades antigues executada.");
        try {
          await TripService.updateTrip(tripId, { users: newUsers, expenses: newExpenses });
        } catch (e) {
          console.error("Error en la migració automàtica", e);
        }
      }

      // ====================================================================
      // 2. MIGRACIÓ D'ARQUITECTURA (Buidar el document principal - Alliberar 1MB)
      // ====================================================================
      try {
        const tripRef = doc(db, DB_PATHS.getTripDocPath(tripId));
        // Llegim les dades en cru directament de Firestore per saber si els arrays encara hi són
        const snap = await getDoc(tripRef);
        
        if (snap.exists()) {
          const data = snap.data();
          const oldLogs = data.logs || [];
          const oldPayments = data.payments || [];

          // Si encara queden logs o pagaments al document principal, fem la mutació
          if (oldLogs.length > 0 || oldPayments.length > 0) {
            console.log(`🚀 Iniciant neteja d'arquitectura per al viatge ${tripId}...`);
            const batch = writeBatch(db);

            // 2.1 Copiem els logs a la subcol·lecció
            oldLogs.forEach((log: any) => {
              if (!log.id) log.id = crypto.randomUUID(); // Fallback per a dades molt antigues
              const logRef = doc(db, DB_PATHS.getLogsCollectionPath(tripId), log.id);
              batch.set(logRef, log);
            });

            // 2.2 Copiem els pagaments a la subcol·lecció
            oldPayments.forEach((payment: any) => {
              if (!payment.id) payment.id = crypto.randomUUID();
              const payRef = doc(db, DB_PATHS.getPaymentsCollectionPath(tripId), payment.id);
              batch.set(payRef, payment);
            });

            // 2.3 ELIMINEM ELS ARRAYS DEL DOCUMENT PRINCIPAL (Màgia d'escala real)
            // Això elimina literalment el camp de la base de dades.
            batch.update(tripRef, {
              logs: deleteField(),
              payments: deleteField()
            });

            // Executem l'intercanvi de forma atòmica
            await batch.commit();
            console.log("✅ Neteja completada: S'han alliberat les dades antigues del document principal.");
          }
        }
      } catch (e) {
        console.error("Error en moure els logs a les subcol·leccions:", e);
      }
    };

    performMigration();
  }, [tripData, tripId]); 
}