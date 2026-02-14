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
        primary: {
          DEFAULT: '#4f46e5', // indigo-600
          hover: '#4338ca',   // indigo-700
          light: '#e0e7ff',   // indigo-100
          dark: '#6366f1',    // indigo-500
        },
        surface: {
          ground: 'var(--surface-ground)', 
          card: 'var(--surface-card)',     
          elevated: 'var(--surface-elevated)', 
        },
        content: {
          body: 'var(--text-body)',       
          muted: 'var(--text-muted)',     
          subtle: 'var(--text-subtle)',   
        },
        status: {
          success: '#10b981', // emerald-500
          error: '#f43f5e',   // rose-500
          warning: '#f59e0b', // amber-500
          info: '#3b82f6',    // blue-500
        }
      },
      // 2. TIPOGRAFIA I FORMES
      fontSize: {
        'xxs': ['0.65rem', { lineHeight: '0.9rem' }], // Etiquetes molt petites
        'xs': ['0.75rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        '3xl': '1.5rem', 
        '4xl': '2rem',   
      },
      // 3. EXCLUSIU: OMBRES FINANCERES (Suaus i amb color)
      boxShadow: {
        'financial-sm': '0 2px 4px -1px rgba(79, 70, 229, 0.06), 0 1px 2px -1px rgba(79, 70, 229, 0.04)',
        'financial-md': '0 4px 6px -1px rgba(79, 70, 229, 0.1), 0 2px 4px -1px rgba(79, 70, 229, 0.06)',
        'financial-lg': '0 10px 15px -3px rgba(79, 70, 229, 0.1), 0 4px 6px -2px rgba(79, 70, 229, 0.05)',
        'glow': '0 0 15px rgba(99, 102, 241, 0.5)', // Per a focus o estats actius
      },
      // 4. GESTIÓ DE CAPES (Z-Index Semàntic)
      zIndex: {
        'base': '0',
        'sticky': '40', // Elements enganxosos (headers)
        'overlay': '50', // Backdrops
        'modal': '60',   // Modals
        'popover': '70', // Menús desplegables
        'toast': '80',   // Notificacions (sempre a sobre)
      },
      // 5. ANIMACIONS INTEGRADES
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-slow': 'pulseSlow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        },
      },
    },
  },
  plugins: [],
}