// eslint.config.js
// Config plana (ESLint 9). `functions/` té la seva pròpia configuració
// independent (functions/.eslintrc.js, paquet npm a part) i queda exclosa d'aquí.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  {
    ignores: ['dist', 'functions/**', 'firestore-tests/**', 'firestore-debug.log'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Només les regles clàssiques (vàlides amb o sense el React Compiler).
      // `recommended` a partir de la v7 hi afegeix tot el conjunt de diagnòstics
      // pensats per al React Compiler (purity, immutability, set-state-in-render...),
      // que aquest projecte no fa servir i que sovint suggereixen canvis que no
      // milloren res aquí (p. ex. eixamplar dependències de useMemo ja precises).
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Habitual en aquest codi: paràmetres/vars intencionadament sense fer servir amb prefix _.
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['vite.config.js', 'vitest.rules.config.ts', 'postcss.config.js', 'tailwind.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Fitxers de Context/Provider: exporten deliberadament el component i els
    // hooks que hi donen accés des del mateix fitxer (patró habitual de React).
    // Separar-los només milloraria el Fast Refresh en desenvolupament; no val
    // la pena la fragmentació per a aquest projecte.
    files: ['src/context/**/*.tsx', 'src/components/Toast.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  }
);
