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
    if (!tripId) {
      setTripData(null);
      setExpenses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

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
      // Si hem sortit o ens han fet fora silenciarem l'error groc a consola
      if (err?.code !== 'permission-denied') {
        console.error(err);
      }
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
      // Si estem sortint del viatge no mostrem error a consola, ja que és un comportament natural
      if (err?.code !== 'permission-denied') {
        console.error("Error carregant despeses:", err);
      }
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