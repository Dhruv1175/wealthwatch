import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── SEMANTIC DESIGN TOKENS ────────────────────────────────────────────
        // These map to CSS variables defined in globals.css so the entire
        // design system can be swapped by editing one file.
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        card:        "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        muted:       "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        border:      "hsl(var(--border))",
        input:       "hsl(var(--input))",
        ring:        "hsl(var(--ring))",
        accent:      "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        surface:     "hsl(var(--surface))",
        "surface-raised": "hsl(var(--surface-raised))",
        // Functional signal tokens
        positive:    "hsl(var(--positive))",
        negative:    "hsl(var(--negative))",
        warning:     "hsl(var(--warning))",
        info:        "hsl(var(--info))",
        premium:     "hsl(var(--premium))",

        // ── LEGACY DIRECT PALETTE (kept for backward compat) ─────────────────
        brand: {
          black: "#000000",
          white: "#FFFFFF",
        },
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
          50:  "#F0FDF4",
          100: "#DCFCE7",
          400: "#4ADE80",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
        },
        sky: {
          50:  "#F0F9FF",
          400: "#38BDF8",
          500: "#0EA5E9",
          700: "#0369A1",
        },
        error: {
          50:  "#FEF2F2",
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
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        slideDown: {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        chartDraw: {
          from: { strokeDashoffset: "1000" },
          to:   { strokeDashoffset: "0" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0" },
        },
        livePulse: {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.3" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },

      animation: {
        "fade-up":    "fadeUp 0.4s ease forwards",
        "fade-in":    "fadeIn 0.3s ease forwards",
        "slide-down": "slideDown 0.2s ease forwards",
        "chart-draw": "chartDraw 2s ease 0.8s forwards",
        "blink":      "blink 1s step-end infinite",
        "live-pulse": "livePulse 2s ease infinite",
        "shimmer":    "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;