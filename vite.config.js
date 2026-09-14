import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Els tests de firestore.rules viuen a firestore-tests/ i necessiten l'emulador
  // en marxa (vegeu `npm run test:rules`). Els excloem de `npm run test` perquè
  // aquest ha de poder córrer ràpid i sense dependències externes (CI inclòs).
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      'firestore-tests/**',
    ],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'maskable-icon-512x512.png', 'logo.svg'],
      workbox: {
        // exportPdf.ts + jsPDF/jsPDF-autotable: només calen si l'usuari
        // exporta un PDF. html2canvas/purify.es/index.es (canvg): deps
        // opcionals de jsPDF per al seu mode .html(), que aquesta app no fa
        // servir mai (grep confirma zero usos) — no es baixaran MAI en cap
        // circumstància real, per això s'exclouen igualment del precache.
        globIgnores: [
          '**/exportPdf-*.js',
          '**/html2canvas.esm-*.js',
          '**/purify.es-*.js',
          '**/index.es-*.js'
        ]
      },
      manifest: {
        name: 'Comptes Clars',
        short_name: 'Comptes',
        description: 'Divideix despeses i viatja lleuger.',
        theme_color: '#ffffff',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  base: '/',
  // Configuració per a 'npm run dev'
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
    }
  },
  // Configuració per a 'npm run preview' (LA NOVA PART CLAU)
  preview: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    // Per defecte Vite afegeix <link rel="modulepreload"> a l'index.html per
    // a TOTS els chunks arribables des de l'entrada, encara que només s'hi
    // arribi per import() dinàmic — descarregant-los igualment a cada
    // càrrega i anul·lant l'estalvi buscat amb l'import dinàmic. L'excloem
    // explícitament del preload perquè només es baixi quan de debò cal
    // (exportar PDF).
    modulePreload: {
      resolveDependencies: (_filename, deps) => deps.filter((dep) => !dep.includes('vendor-pdf'))
    },
    rollupOptions: {
      output: {
        // NOTA: jspdf/jspdf-autotable/html2canvas/dompurify/canvg NO van aquí
        // a propòsit. Agrupar-los en un manualChunk propi feia que Rollup hi
        // col·loqués l'utilitat compartida __vitePreload (necessària per a
        // QUALSEVOL import() dinàmic de l'app, incloent-hi les rutes amb
        // React.lazy) — l'entrada havia d'importar-la estàticament, forçant
        // la baixada dels 808 KB a cada càrrega igualment. Sense manualChunk,
        // Rollup els inclou directament dins del chunk async d'exportPdf.ts
        // (el seu únic consumidor), que només es baixa en exportar un PDF.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'vendor-ui': ['lucide-react'],
          'vendor-sentry': ['@sentry/react']
        }
      }
    }
  }
});