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
    if (!tripId) return;
    setLoading(true);
    
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
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError(err.code === 'permission-denied' ? "⛔ Accés denegat." : "Error carregant el grup.");
      setLoading(false);
    });

    // 2. Subscripció a les Despeses
    const expensesRef = collection(db, 'artifacts', appId, 'public', 'data', 'trips', `trip_${tripId}`, 'expenses');
    const unsubExpenses = onSnapshot(expensesRef, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Expense[]);
    });

    return () => {
      unsubTrip();
      unsubExpenses();
    };
  }, [tripId]);

  return { tripData, expenses, loading, error };
}