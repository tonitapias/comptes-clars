// src/config/dbPaths.ts
import { appId } from './firebase';

// Prefix que utilitzem per als IDs dels documents de viatge (legacy)
export const TRIP_DOC_PREFIX = 'trip_';

// Rutes base de la base de dades
export const DB_PATHS = {
  // Ruta principal de la col·lecció de viatges: "artifacts/{appId}/public/data/trips"
  TRIPS_COLLECTION: `artifacts/${appId}/public/data/trips`,
  
  // Helper per construir la ruta d'un document de viatge específic
  getTripDocPath: (tripId: string) => 
    `artifacts/${appId}/public/data/trips/${TRIP_DOC_PREFIX}${tripId}`,

  // Helper per construir la ruta de la subcol·lecció de despeses
  getExpensesCollectionPath: (tripId: string) => 
    `artifacts/${appId}/public/data/trips/${TRIP_DOC_PREFIX}${tripId}/expenses`,

  // Helper per construir la ruta d'una despesa específica
  getExpenseDocPath: (tripId: string, expenseId: string) => 
    `artifacts/${appId}/public/data/trips/${TRIP_DOC_PREFIX}${tripId}/expenses/${expenseId}`
};