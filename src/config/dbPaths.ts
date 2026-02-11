// src/config/dbPaths.ts
import { appId } from './firebase'; // <--- IMPORTEM LA VARIABLE REAL

// Ara construïm la ruta usant l'ID real de la teva configuració
const BASE_PATH = `artifacts/${appId}/public/data`;

export const TRIP_DOC_PREFIX = 'trip_';

export const DB_PATHS = {
  TRIPS_COLLECTION: `${BASE_PATH}/trips`,
  
  getTripDocPath: (tripId: string) => {
    // Si l'ID ja porta el prefix, no el posem dues vegades
    const docId = tripId.startsWith(TRIP_DOC_PREFIX) ? tripId : `${TRIP_DOC_PREFIX}${tripId}`;
    return `${BASE_PATH}/trips/${docId}`;
  },

  getExpensesCollectionPath: (tripId: string) => {
    const docId = tripId.startsWith(TRIP_DOC_PREFIX) ? tripId : `${TRIP_DOC_PREFIX}${tripId}`;
    return `${BASE_PATH}/trips/${docId}/expenses`;
  },

  getExpenseDocPath: (tripId: string, expenseId: string) => {
    const docId = tripId.startsWith(TRIP_DOC_PREFIX) ? tripId : `${TRIP_DOC_PREFIX}${tripId}`;
    return `${BASE_PATH}/trips/${docId}/expenses/${expenseId}`;
  }
};