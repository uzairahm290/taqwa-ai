/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#C9A84C',
          light: '#E8C96A',
          muted: '#7A6230',
        },
        bg: {
          DEFAULT: '#0A0A0F',
          card: '#111118',
          nav: '#0D0D14',
        },
        text: {
          primary: '#F0EDE6',
          secondary: '#9E9B94',
          tertiary: '#5C5A55',
        },
        success: '#3DA876',
        danger: '#8B3A3A',
      },
      fontFamily: {
        heading: ['CormorantGaramond_600SemiBold'],
        headingLight: ['CormorantGaramond_400Regular'],
        body: ['Inter_400Regular'],
        bodyMedium: ['Inter_500Medium'],
        bodySemiBold: ['Inter_600SemiBold'],
        mono: ['JetBrainsMono_400Regular'],
        arabic: ['Amiri_400Regular'],
      },
    },
  },
  plugins: [],
};
