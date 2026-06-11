/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#232323',
          secondary: '#2d2d2d',
          tertiary: '#383838',
          hover: '#404040',
          card: '#2a2a2e',
        },
        text: {
          primary: '#e0e0e0',
          secondary: '#a0a0a0',
          muted: '#707070',
        },
        accent: {
          DEFAULT: '#4a9eff',
          hover: '#6cb3ff',
          active: '#3580d4',
          glow: 'rgba(74, 158, 255, 0.25)',
        },
        border: {
          DEFAULT: '#4a4a4a',
          subtle: '#3a3a3a',
        },
        danger: '#e55c5c',
        success: '#5cb85c',
        warning: '#f0ad4e',
      },
      fontFamily: {
        sans: ['"Segoe UI"', '-apple-system', 'BlinkMacSystemFont', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, #4a9eff, #7c5cff)',
      },
      animation: {
        'fade-up': 'fadeUp 0.35s ease both',
        'spin-slow': 'spin 0.6s linear infinite',
        'success-pop': 'successPop 0.3s ease',
        'toast-in': 'toastIn 0.3s ease',
        'toast-out': 'toastOut 0.25s ease forwards',
        'pulse-dot': 'pulseDot 2s ease infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        successPop: {
          '0%': { transform: 'scale(0.5)' },
          '60%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
        toastIn: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        toastOut: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(12px)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
}

