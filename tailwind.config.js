/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './App.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}'
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        canvas: '#f4f8ff',
        card: 'rgba(255,255,255,0.86)',
        textPrimary: '#17233b',
        textSecondary: '#324261',
        textMuted: '#5f7398',
        textHint: '#8ea2c4',
        borderSoft: 'rgba(34,63,115,0.08)',
        borderMed: 'rgba(34,63,115,0.12)',
        brandStart: '#ff6b8a',
        brandEnd: '#4bc6d7',
        pinkSoft: '#ffd9e2',
        tealSoft: '#d8f4f6',
        purpleSoft: '#ece6ff',
        skySoft: '#dbeafe'
      },
      borderRadius: {
        xl2: 20
      },
      borderWidth: {
        DEFAULT: '0px'
      }
    }
  },
  plugins: []
};
