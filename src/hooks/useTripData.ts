import { useState, useEffect } from 'react';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { TripData, Expense } from '../types';

export function useTripData(tripId: string | undefined) {
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // [SAFE-FIX]: Neteja d'estat segura. Evitem que l'usuari vegi
    // dades d'un altre viatge o que l'spinner quedi penjat si surt de la ruta.
    if (!tripId) {
      setTripData(null);
      setExpenses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // [SAFE-FIX]: Semàfors. Sincronitzem l'aparició de dades perquè
    // el renderitzat inicial sigui perfecte, sense parpellejos.
    let isTripReady = false;
    let isExpensesReady = false;

    const resolveLoading = () => {
      if (isTripReady && isExpensesReady) {
        setLoading(false);
      }
    };
    
    // 1. Subscripció al Trip
    const tripRef = doc(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`);
    const unsubTrip = onSnapshot(tripRef, (docSnap) => {
      if (docSnap.exists()) {
        setTripData(docSnap.data() as TripData);
        setError(null);
      } else {
        setError("Grup no trobat");
        setTripData(null);
      }
      isTripReady = true;
      resolveLoading();
    }, (err: any) => { 
      console.error(err);
      setError(err?.code === 'permission-denied' ? "⛔ Accés denegat." : "Error carregant el grup.");
      isTripReady = true;
      resolveLoading();
    });

    // 2. Subscripció a les Despeses
    const expensesRef = collection(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`, 'expenses');
    const unsubExpenses = onSnapshot(expensesRef, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Expense[]);
      isExpensesReady = true;
      resolveLoading();
    }, (err: any) => {
      console.error(err);
      isExpensesReady = true;
      resolveLoading();
    });

    return () => {
      unsubTrip();
      unsubExpenses();
    };
  }, [tripId]);

  return { tripData, expenses, loading, error };
}