// Config vitest separada per als tests de firestore.rules (firestore-tests/).
// S'executen a part (npm run test:rules) perquè necessiten l'emulador de Firestore
// en marxa; el `vite.config.js` principal els exclou expressament de `npm run test`.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['firestore-tests/**/*.spec.ts'],
    hookTimeout: 20000,
  },
});
