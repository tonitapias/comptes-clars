// src/config/dbPaths.ts
import { appId } from './firebase'; 

const BASE_PATH = `artifacts/${appId}/public/data`;

export const TRIP_DOC_PREFIX = 'trip_';

export const DB_PATHS = {
  TRIPS_COLLECTION: `${BASE_PATH}/trips`,
  
  getTripDocPath: (tripId: string) => {
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
  },

  // [NOVA ARQUITECTURA]: Rutes estandarditzades per a les subcol·leccions de domini
  getPaymentsCollectionPath: (tripId: string) => {
    const docId = tripId.startsWith(TRIP_DOC_PREFIX) ? tripId : `${TRIP_DOC_PREFIX}${tripId}`;
    return `${BASE_PATH}/trips/${docId}/payments`;
  },

  getLogsCollectionPath: (tripId: string) => {
    const docId = tripId.startsWith(TRIP_DOC_PREFIX) ? tripId : `${TRIP_DOC_PREFIX}${tripId}`;
    return `${BASE_PATH}/trips/${docId}/logs`;
  }
};