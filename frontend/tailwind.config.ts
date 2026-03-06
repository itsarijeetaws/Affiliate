import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f8f7",
          100: "#dfeeea",
          500: "#13795b",
          700: "#0f5e47",
          900: "#093629"
        }
      }
    }
  },
  plugins: []
};

export default config;
