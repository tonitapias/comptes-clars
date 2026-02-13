/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 1. COLORS SEMÀNTICS (Tokens)
      colors: {
        // Colors de marca (Brand)
        primary: {
          DEFAULT: '#4f46e5', // indigo-600
          hover: '#4338ca',   // indigo-700
          light: '#e0e7ff',   // indigo-100 (fons suaus)
          dark: '#6366f1',    // indigo-500 (per a mode fosc)
        },
        // Colors de superfície (Backgrounds)
        surface: {
          ground: 'var(--surface-ground)', // Fons general (slate-50 / slate-950)
          card: 'var(--surface-card)',     // Fons targetes (white / slate-900)
          elevated: 'var(--surface-elevated)', // Modals/Popups
        },
        // Colors de text
        content: {
          body: 'var(--text-body)',       // Text principal
          muted: 'var(--text-muted)',     // Text secundari
          subtle: 'var(--text-subtle)',   // Text terciari/placeholders
        },
        // Estats (Feedback)
        status: {
          success: '#10b981', // emerald-500
          error: '#f43f5e',   // rose-500
          warning: '#f59e0b', // amber-500
        }
      },
      // 2. TIPOGRAFIA CONTROLADA
      fontSize: {
        // Substituïm el "magic number" 10px per un token 'xxs' accessible (11-12px)
        // Utilitzarem 0.75rem (12px) com a mínim absolut per llegibilitat.
        'xxs': ['0.75rem', { lineHeight: '1rem' }], 
      },
      // 3. OTHERS
      borderRadius: {
        '3xl': '1.5rem', // Per a cards grans
        '4xl': '2rem',   // Per a contenidors principals
      }
    },
  },
  plugins: [],
}