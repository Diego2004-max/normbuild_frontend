import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        civic: {
          ink: '#172033',
          blue: '#1E5B9A',
          green: '#2E7D5B',
          gold: '#B7791F',
          mist: '#EDF4F7',
        },
      },
      boxShadow: {
        panel: '0 16px 50px rgb(23 32 51 / 0.12)',
      },
    },
  },
  plugins: [],
} satisfies Config;
