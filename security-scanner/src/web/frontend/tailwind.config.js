/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        dark: {
          50: '#e0e0e0',
          100: '#a0a0a0',
          200: '#808080',
          300: '#606060',
          400: '#404040',
          500: '#2a2a3e',
          600: '#1a1a2e',
          700: '#16213e',
          800: '#0f0f1e',
          900: '#0a0a14',
        }
      }
    },
  },
  plugins: [],
}

