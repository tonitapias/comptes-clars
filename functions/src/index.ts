import * as admin from "firebase-admin";

admin.initializeApp();

// Cap funció exportada actualment. L'antiga `leaveTrip` s'ha retirat: apuntava
// a `trips/{tripId}` en comptes de la ruta real de l'app
// (`artifacts/comptes-clars-v1/public/data/trips/trip_{tripId}`, vegeu
// src/config/dbPaths.ts) i mai havia estat cridada des del frontend — "sortir
// del viatge" es fa amb el SDK client a src/services/tripService.ts.
