import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#0B3D2E',
          dark: '#07241B',
          gold: '#C9A227',
          sand: '#F6F1E6',
          cream: '#FBF8F1'
        }
      },
      fontFamily: {
        sans: ['Tajawal', 'Segoe UI', 'Tahoma', 'Arial', 'sans-serif']
      },
      boxShadow: {
        soft: '0 24px 60px -38px rgba(7, 36, 27, 0.55)'
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' }
        }
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        'slide-up': 'slide-up 0.3s ease-out both'
      }
    }
  },
  plugins: []
};

export default config;
