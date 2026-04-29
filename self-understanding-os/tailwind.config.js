/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', 'Noto Sans JP', 'sans-serif'],
        body: ['Inter', 'Noto Sans JP', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        app: {
          bg: '#0d0b09',
          'bg-elev': '#15110d',
          panel: '#1a1612',
          border: '#2a231c',
          'border-soft': '#3a3128',
          amber: '#f5b74e',
          'amber-soft': '#f0a830',
          fog: '#7aa6c4',
          'fog-soft': '#5b89a8',
          rose: '#e8745c',
          text: '#f0e6d8',
          'text-soft': '#cbbeac',
          dim: '#8b7d6b',
          mute: '#5e5347',
        },
        jarvis: {
          bg: '#0d0b09',
          'bg-elev': '#15110d',
          panel: '#1a1612',
          border: '#2a231c',
          cyan: '#f5b74e',
          blue: '#7aa6c4',
          accent: '#f0e6d8',
          dim: '#8b7d6b',
          text: '#f0e6d8',
        },
      },
      borderRadius: {
        card: '14px',
        chip: '10px',
      },
      boxShadow: {
        soft: '0 1px 3px rgba(0, 0, 0, 0.4), 0 8px 24px -8px rgba(245, 183, 78, 0.08)',
        lift: '0 4px 16px -4px rgba(245, 183, 78, 0.18)',
        glow: '0 4px 16px -4px rgba(245, 183, 78, 0.18)',
        'glow-soft': '0 1px 3px rgba(0, 0, 0, 0.4), 0 8px 24px -8px rgba(245, 183, 78, 0.08)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out both',
        'rise-in': 'riseIn 0.45s ease-out both',
        'pulse-glow': 'fadeIn 0.4s ease-out both',
        'glow-in': 'riseIn 0.45s ease-out both',
        sweep: 'fadeIn 0.4s ease-out both',
      },
    },
  },
  plugins: [],
};
