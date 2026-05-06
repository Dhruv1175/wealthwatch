import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          black: "#000000",   // pure black background
          white: "#FFFFFF",
        },
        // Custom grayscale used in the design
        gray: {
          950: "#0A0A0A",
          900: "#111111",
          800: "#1A1A1A",
          700: "#242424",
          600: "#2E2E2E",
          500: "#555555",
          400: "#888888",
          300: "#AAAAAA",
          200: "#D4D4D4",
          100: "#F5F5F5",
        },
        mint: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          400: "#4ADE80",       // lighter mint for highlights
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
        },
        sky: {
          50: "#F0F9FF",
          400: "#38BDF8",
          500: "#0EA5E9",
          700: "#0369A1",
        },
        error: {
          50: "#FEF2F2",
          400: "#F87171",
          500: "#EF4444",
          700: "#B91C1C",
        },
      },
      fontFamily: {
        sans: ["Geist", "sans-serif"],
        mono: ["Geist Mono", "monospace"],
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        chartDraw: {
          from: { strokeDashoffset: "1000" },
          to: { strokeDashoffset: "0" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        pulse2: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease forwards",
        "chart-draw": "chartDraw 2s ease 0.8s forwards",
        blink: "blink 1s step-end infinite",
        "live-pulse": "pulse2 2s ease infinite",
      },
    },
  },
  plugins: [],
};

export default config;