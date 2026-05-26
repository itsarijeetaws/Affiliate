import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"]
      },
      colors: {
        orange: {
          DEFAULT: "#FF9900",
          50:  "#fff8eb",
          100: "#ffefc7",
          200: "#ffd980",
          300: "#ffbf33",
          400: "#ffa500",
          500: "#FF9900",
          600: "#e68a00",
          700: "#b36b00",
          800: "#804d00",
          900: "#4d2e00",
        }
      }
    }
  },
  plugins: []
};

export default config;
