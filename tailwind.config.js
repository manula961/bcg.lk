/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", 
  ],
  theme: {
    extend: {
      colors: {
        maroon: '#7B1C1C',
        gold: '#C9A84C',
        navy: '#1a3a6b',
      },
    },
  },
  plugins: [],
};
