/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        indigo: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        violet: {
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
          950: '#2e1065',
        },
      },
      fontFamily: {
        thai: ['var(--font-ibm-plex-thai)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'dice-roll': 'diceRoll 1s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
        'piece-move': 'pieceMove 0.6s ease-out',
        'confetti': 'confetti 2s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        diceRoll: {
          '0%': { transform: 'rotateX(0deg) rotateY(0deg) scale(1)' },
          '25%': { transform: 'rotateX(180deg) rotateY(90deg) scale(1.1)' },
          '50%': { transform: 'rotateX(360deg) rotateY(180deg) scale(0.9)' },
          '75%': { transform: 'rotateX(540deg) rotateY(270deg) scale(1.05)' },
          '100%': { transform: 'rotateX(720deg) rotateY(360deg) scale(1)' },
        },
        pieceMove: {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(var(--tx), var(--ty)) scale(1.2)' },
          '100%': { transform: 'translate(var(--tx), var(--ty)) scale(1)' },
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};