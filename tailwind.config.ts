import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Semantic tokens (resolve to CSS variables) ────────────────────
        background:            "hsl(var(--background))",
        foreground:            "hsl(var(--foreground))",
        card:                  "hsl(var(--surface))",
        "card-foreground":     "hsl(var(--foreground))",
        muted:                 "hsl(var(--muted))",
        "muted-foreground":    "hsl(var(--muted-foreground))",
        border:                "hsl(var(--border-token))",
        input:                 "hsl(var(--input))",
        ring:                  "hsl(var(--ring))",
        accent:                "hsl(var(--accent))",
        "accent-foreground":   "hsl(var(--accent-foreground))",
        surface:               "hsl(var(--surface-token))",
        "surface-raised":      "hsl(var(--surface-raised-token))",
        positive:              "hsl(var(--positive))",
        negative:              "hsl(var(--negative))",
        warning:               "hsl(var(--warning))",
        info:                  "hsl(var(--info))",
        premium:               "hsl(var(--premium))",

        // ── Legacy direct palette (kept for backward compat) ──────────────
        brand:  { black: "#000000", white: "#FFFFFF" },
        mint:   { 400: "#4ADE80", 500: "#22C55E", 600: "#16A34A" },
        sky:    { 400: "#38BDF8", 500: "#0EA5E9" },
        error:  { 400: "#F87171", 500: "#EF4444" },
      },
      fontFamily: {
        sans: ["Geist", "sans-serif"],
        mono: ["Geist Mono", "monospace"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;