/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // ← 追加！
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#ffefec",
          100: "#ffdfda",
          200: "#ffd0c8",
          300: "#ffb8ac",
          400: "#ffa090",
          500: "#ff6146",
          600: "#e6573f",
          700: "#cc4e38",
          800: "#a63f2e",
          900: "#803023",
          950: "#592218",
          DEFAULT: "#ff6146",
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,24,40,.05), 0 1px 6px rgba(16,24,40,.06)",
      },
    },
  },
  plugins: [],
};
