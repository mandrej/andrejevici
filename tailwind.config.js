/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#1976d2',
        secondary: '#0fd3bf',
        accent: '#c830e2',
        positive: '#71eb8e',
        negative: '#c10015',
        info: '#31ccec',
        warning: '#f2c037',
        light: '#eeecec',
        dark: '#121212',
        'light-page': '#fff',
        'dark-page': '#333333',
      },
    },
  },
  plugins: [],
}
