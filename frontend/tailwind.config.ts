import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0c1020",
          dark: "#080b16",
          blue: "#1e295d",
          cyan: "#00f0ff",
          teal: "#0df",
          orange: "#ff7b00",
          card: "rgba(18, 24, 48, 0.4)",
          border: "rgba(255, 255, 255, 0.08)"
        }
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "cyan-glow": "0 0 15px rgba(0, 240, 255, 0.25)",
        "orange-glow": "0 0 15px rgba(255, 123, 0, 0.25)"
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        fadeIn: "fadeIn 0.2s ease-out forwards"
      }
    },
  },
  plugins: [],
};
export default config;
