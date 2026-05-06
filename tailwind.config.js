/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#050810',
          800: '#0a0f1e',
          700: '#0f1629',
          600: '#161f3a',
          500: '#1e2a4a',
        },
      },
    },
  },
  plugins: [],
}
