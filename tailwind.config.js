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
          // A11Y FIX: Pugem de 500 a 600 per garantir contrast de text sobre blanc (WCAG AA)
          success: '#059669', // emerald-600 (Abans emerald-500)
          error: '#e11d48',   // rose-600    (Abans rose-500)
          warning: '#d97706', // amber-600   (Abans amber-500)
          info: '#2563eb',    // blue-600    (Abans blue-500)
        },
        // NEW: Tokens financers semàntics (Abstracció del color)
        financial: {
            credit: '#059669', // Alias de status.success
            debt: '#e11d48',   // Alias de status.error
        }
      },
      // 2. TIPOGRAFIA I FORMES
      fontSize: {
        // A11Y FIX: Eliminem la mida 10px. El mínim serà 12px (0.75rem).
        // Mantenim la clau 'xxs' perquè el codi no peti, però l'igualem a 'xs'.
        'xxs': ['0.75rem', { lineHeight: '1rem' }], 
        'xs': ['0.75rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        '3xl': '1.5rem', 
        '4xl': '2rem',   
      },
      // 3. EXCLUSIU: OMBRES FINANCERES
      boxShadow: {
        'financial-sm': '0 2px 4px -1px rgba(79, 70, 229, 0.06), 0 1px 2px -1px rgba(79, 70, 229, 0.04)',
        'financial-md': '0 4px 6px -1px rgba(79, 70, 229, 0.1), 0 2px 4px -1px rgba(79, 70, 229, 0.06)',
        'financial-lg': '0 10px 15px -3px rgba(79, 70, 229, 0.1), 0 4px 6px -2px rgba(79, 70, 229, 0.05)',
        'glow': '0 0 15px rgba(99, 102, 241, 0.5)',
      },
      zIndex: {
        'base': '0',
        'sticky': '40', 
        'overlay': '50', 
        'modal': '60',   
        'popover': '70', 
        'toast': '80',   
      },
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