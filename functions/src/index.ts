import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

interface LeaveTripData {
  tripId: string;
}

export const leaveTrip = onCall(async (
  request: CallableRequest<LeaveTripData>
) => {
  const tripId = request.data.tripId;
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError(
      "unauthenticated",
      "L'usuari ha d'estar autenticat."
    );
  }
  if (!tripId) {
    throw new HttpsError(
      "invalid-argument",
      "Cal proporcionar l'ID del viatge."
    );
  }

  const tripRef = db.collection("trips").doc(tripId);

  return db.runTransaction(async (txn: admin.firestore.Transaction) => {
    const tripSnap = await txn.get(tripRef);
    if (!tripSnap.exists) {
      throw new HttpsError("not-found", "El viatge no existeix.");
    }

    const tripData = tripSnap.data();
    const isMember = tripData?.memberUids?.includes(uid);

    if (!isMember) {
      throw new HttpsError(
        "permission-denied",
        "No ets membre d'aquest viatge."
      );
    }

    // 1. Busquem el nom de l'usuari a la llista per al Registre (Log)
    const user = tripData?.users?.find(
      (u: any) => u.linkedUid === uid || u.id === uid
    );
    const userName = user ? user.name : "Un usuari";

    // 2. Desvinculem el compte a la llista d'usuaris (Frontend net)
    const updatedUsers = tripData?.users?.map((u: any) => {
      if (u.linkedUid === uid || u.id === uid) {
        return {...u, linkedUid: null};
      }
      return u;
    });

    const updatedMemberUids = tripData?.memberUids.filter(
      (id: string) => id !== uid
    );

    // 3. Creem el Log complet amb userName obligatori
    const logEntry = {
      id: db.collection("_").doc().id,
      action: "leave",
      message: `${userName} ha abandonat el viatge.`,
      userId: uid,
      userName: userName, // <-- ALERTA: Això és el que faltava!
      timestamp: new Date().toISOString(),
    };

    txn.update(tripRef, {
      memberUids: updatedMemberUids,
      users: updatedUsers,
      logs: admin.firestore.FieldValue.arrayUnion(logEntry),
    });

    return {success: true};
  });
});