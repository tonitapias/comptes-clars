import { useState, useEffect } from 'react';
import { doc, collection, onSnapshot, FirestoreError } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { TripData, Expense } from '../types';

export function useTripData(tripId: string | undefined) {
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // [RISC ZERO]: Afegim estat de xarxa natiu sense alterar la lògica existent de dades.
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // [RISC ZERO]: Listeners per a la resiliència de xarxa
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
    }, (err: FirestoreError) => { // [RISC ZERO]: Substituït 'any' per FirestoreError
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
    }, (err: FirestoreError) => { // [RISC ZERO]: Substituït 'any' per FirestoreError
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

  // [RISC ZERO]: Retornem l'isOffline perquè ho pugui consumir qualsevol component si ho necessita en el futur
  return { tripData, expenses, loading, error, isOffline };
}