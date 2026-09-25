/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f2f9f4',
          100: '#e1f2e6',
          200: '#c5e4ce',
          500: '#2f855a',
          600: '#276749',
          700: '#22543d',
          800: '#1c4532',
          900: '#133224',
        },
        amberGold: {
          400: '#ecc94b',
          500: '#d69e2e',
          600: '#b7791f',
        }
      }
    },
  },
  plugins: [],
}
