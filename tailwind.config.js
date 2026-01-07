/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <--- AFEGIT: Activa el mode fosc manual
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}