/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          400: '#5eead4',
          500: '#2dd4bf',
          600: '#0f9f91',
          700: '#087f83',
          800: '#11616d',
          900: '#123f54',
        },
      },
      fontFamily: {
        display: ['Oswald', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}