import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // S'actualitza sola quan treus una nova versió
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'maskable-icon.png'],
      manifest: {
        name: 'Comptes Clars',
        short_name: 'Comptes',
        description: 'Divideix despeses i viatja lleuger.',
        theme_color: '#ffffff',
        background_color: '#f8fafc', // Coincideix amb el bg-slate-50
        display: 'standalone', // Fa que sembli una app nativa (sense barra URL)
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
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
            purpose: 'maskable' // Important per Android (icones rodones)
          }
        ]
      }
    })
  ],
  // --- NOVA SECCIÓ: Optimització del Build ---
  build: {
    chunkSizeWarningLimit: 1000, // Pugem el límit de l'avís a 1MB (per si de cas)
    rollupOptions: {
      output: {
        manualChunks: {
          // Separem les llibreries grans en fitxers independents per millorar la càrrega
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          'vendor-ui': ['lucide-react']
        }
      }
    }
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
  },
});