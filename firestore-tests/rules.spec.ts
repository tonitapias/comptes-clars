// firestore-tests/rules.spec.ts
//
// Tests d'integració per a firestore.rules. Necessiten l'emulador de Firestore
// en marxa (per això viuen fora de src/ i no s'executen amb `npm run test`).
//
// Execució: npm run test:rules
// (equival a: firebase emulators:exec --only firestore "vitest run firestore-tests")

import { readFileSync } from 'fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  arrayUnion,
} from 'firebase/firestore';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

const PROJECT_ID = 'demo-comptes-clars';
const APP_ID = 'comptes-clars-v1';
const tripPath = (tripId: string) => `artifacts/${APP_ID}/public/data/trips/${tripId}`;

const [emuHost, emuPort] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: emuHost,
      port: Number(emuPort),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    // Viatge "normal": Alice n'és propietària i membre; Bob també és membre.
    await setDoc(doc(db, tripPath('trip_t1')), {
      id: 't1',
      name: 'Viatge original',
      ownerId: 'alice',
      memberUids: ['alice', 'bob'],
      users: [
        { id: 'u-alice', name: 'Alice', linkedUid: 'alice' },
        { id: 'u-bob', name: 'Bob', linkedUid: 'bob' },
      ],
      isDeleted: false,
    });
    // Viatge "llegat": anterior al camp ownerId.
    await setDoc(doc(db, tripPath('trip_legacy')), {
      id: 'legacy',
      name: 'Viatge antic',
      memberUids: ['alice', 'bob'],
      users: [
        { id: 'u-alice', name: 'Alice', linkedUid: 'alice' },
        { id: 'u-bob', name: 'Bob', linkedUid: 'bob' },
      ],
    });
    await setDoc(doc(db, `${tripPath('trip_t1')}/expenses/e1`), {
      title: 'Sopar', amount: 1000, payer: 'u-alice', involved: ['u-alice', 'u-bob'],
    });
  });
});

const asUser = (uid: string) => testEnv.authenticatedContext(uid).firestore();
const asAnon = () => testEnv.unauthenticatedContext().firestore();

describe('firestore.rules — document del viatge', () => {

  it('BLOQUEJA el segrest total: un no-membre no pot reescriure altres camps encara que s\'afegeixi a memberUids', async () => {
    const db = asUser('mallory');
    await assertFails(updateDoc(doc(db, tripPath('trip_t1')), {
      memberUids: ['mallory'],
      users: [],
      name: 'pwned',
      isDeleted: true,
    }));
  });

  it('BLOQUEJA un intent mixt: memberUids correcte però colant un altre camp (name)', async () => {
    const db = asUser('mallory');
    await assertFails(updateDoc(doc(db, tripPath('trip_t1')), {
      memberUids: arrayUnion('mallory'),
      name: 'sneaky',
    }));
  });

  it('PERMET la unió legítima: un no-membre només toca users/memberUids per afegir-s\'hi', async () => {
    const db = asUser('mallory');
    await assertSucceeds(updateDoc(doc(db, tripPath('trip_t1')), {
      users: arrayUnion({ id: 'u-mallory', name: 'Mallory', linkedUid: 'mallory' }),
      memberUids: arrayUnion('mallory'),
    }));
  });

  it('PERMET que un membre existent editi qualsevol altre camp (configuració normal)', async () => {
    const db = asUser('alice');
    await assertSucceeds(updateDoc(doc(db, tripPath('trip_t1')), {
      name: 'Nom nou',
      isSettled: true,
    }));
  });

  it('BLOQUEJA que un membre que NO és propietari esborri el viatge', async () => {
    const db = asUser('bob');
    await assertFails(deleteDoc(doc(db, tripPath('trip_t1'))));
  });

  it('PERMET que el propietari esborri el viatge', async () => {
    const db = asUser('alice');
    await assertSucceeds(deleteDoc(doc(db, tripPath('trip_t1'))));
  });

  it('viatges antics sense ownerId: el primer de memberUids fa de propietari', async () => {
    await assertSucceeds(deleteDoc(doc(asUser('alice'), tripPath('trip_legacy'))));
  });

  it('viatges antics sense ownerId: el segon membre NO pot esborrar', async () => {
    await assertFails(deleteDoc(doc(asUser('bob'), tripPath('trip_legacy'))));
  });

  it('un no-membre no pot esborrar ni actualitzar sense unir-se', async () => {
    const db = asUser('mallory');
    await assertFails(deleteDoc(doc(db, tripPath('trip_t1'))));
  });

  it('un usuari no autenticat no pot llegir ni escriure', async () => {
    const db = asAnon();
    await assertFails(getDoc(doc(db, tripPath('trip_t1'))));
    await assertFails(updateDoc(doc(db, tripPath('trip_t1')), { name: 'x' }));
  });

  it('un no-membre SÍ pot fer `get` per ID (necessari per unir-se via enllaç/codi)', async () => {
    await assertSucceeds(getDoc(doc(asUser('mallory'), tripPath('trip_t1'))));
  });

  it('BLOQUEJA llistar TOTS els viatges sense filtrar per `memberUids` propi (l\'enumeració real)', async () => {
    const db = asUser('mallory');
    await assertFails(getDocs(collection(db, `artifacts/${APP_ID}/public/data/trips`)));
  });

  it('BLOQUEJA llistar filtrant per l\'uid d\'ALTRI (no es pot fer "list" amb un uid que no és el propi)', async () => {
    const db = asUser('mallory');
    const q = query(
      collection(db, `artifacts/${APP_ID}/public/data/trips`),
      where('memberUids', 'array-contains', 'alice')
    );
    await assertFails(getDocs(q));
  });

  it('PERMET llistar només ELS PROPIS viatges (mateixa query que TripService.getUserTrips)', async () => {
    const db = asUser('alice');
    const q = query(
      collection(db, `artifacts/${APP_ID}/public/data/trips`),
      where('memberUids', 'array-contains', 'alice')
    );
    const snap = await assertSucceeds(getDocs(q));
    expect(snap.docs.map(d => d.id).sort()).toEqual(['trip_legacy', 'trip_t1']);
  });

});

describe('firestore.rules — subcol·leccions (expenses/payments/logs)', () => {

  it('un membre pot llegir les despeses', async () => {
    await assertSucceeds(getDoc(doc(asUser('bob'), `${tripPath('trip_t1')}/expenses/e1`)));
  });

  it('un no-membre NO pot llegir les despeses', async () => {
    await assertFails(getDoc(doc(asUser('mallory'), `${tripPath('trip_t1')}/expenses/e1`)));
  });

  it('un no-membre NO pot escriure despeses', async () => {
    await assertFails(setDoc(doc(collection(asUser('mallory'), `${tripPath('trip_t1')}/expenses`)), {
      title: 'Intrús', amount: 500, payer: 'u-alice', involved: ['u-alice'],
    }));
  });

  it('un membre pot afegir una despesa', async () => {
    await assertSucceeds(setDoc(doc(collection(asUser('alice'), `${tripPath('trip_t1')}/expenses`)), {
      title: 'Esmorzar', amount: 500, payer: 'u-alice', involved: ['u-alice', 'u-bob'],
    }));
  });

});
