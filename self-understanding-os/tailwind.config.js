/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Rajdhani', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'monospace'],
      },
      colors: {
        jarvis: {
          bg: '#02060d',
          panel: '#0a1422',
          border: '#13304d',
          cyan: '#00e5ff',
          blue: '#3aa0ff',
          accent: '#7df9ff',
          dim: '#6b8cae',
        },
      },
      boxShadow: {
        glow: '0 0 12px rgba(0, 229, 255, 0.45), 0 0 32px rgba(0, 229, 255, 0.15)',
        'glow-soft': '0 0 8px rgba(0, 229, 255, 0.25)',
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(0, 229, 255, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 0.06) 1px, transparent 1px)',
        scanline:
          'repeating-linear-gradient(0deg, rgba(0, 229, 255, 0.04) 0, rgba(0, 229, 255, 0.04) 1px, transparent 1px, transparent 3px)',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 6px rgba(0, 229, 255, 0.6))' },
          '50%': { opacity: '0.75', filter: 'drop-shadow(0 0 12px rgba(0, 229, 255, 0.9))' },
        },
        sweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.4s ease-in-out infinite',
        sweep: 'sweep 3.5s linear infinite',
      },
    },
  },
  plugins: [],
};
