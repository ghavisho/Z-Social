import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Z color system — purple is the accent, not the whole UI (see spec §2, §16).
        // Every token below is driven by a CSS variable (defined in
        // app/globals.css, :root for light / .dark for dark) using the
        // rgb(var(--x) / <alpha-value>) pattern. This means components that
        // already use these tokens (bg-y-soft, text-ink, bg-surface-light,
        // etc.) automatically respond to dark mode — no per-component edits
        // needed. Only literal Tailwind built-ins like bg-white don't.
        y: {
          deep: "rgb(var(--color-y-deep) / <alpha-value>)",
          royal: "rgb(var(--color-y-royal) / <alpha-value>)",
          lavender: "rgb(var(--color-y-lavender) / <alpha-value>)",
          soft: "rgb(var(--color-y-soft) / <alpha-value>)",
        },
        surface: {
          light: "rgb(var(--color-surface) / <alpha-value>)",
          muted: "rgb(var(--color-surface-muted) / <alpha-value>)",
          dark: "#15121C",
          "dark-muted": "#1E1927",
        },
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          muted: "rgb(var(--color-ink-muted) / <alpha-value>)",
          inverted: "rgb(var(--color-ink-inverted) / <alpha-value>)",
        },
        charcoal: "rgb(var(--color-charcoal) / <alpha-value>)",
        success: "#2FAE6B",
        warning: "#E3A21A",
        danger: "#E14F4F",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        y: "14px", // Z's signature moderate radius — never pill-everything, never square
      },
      boxShadow: {
        y: "0 4px 20px -6px rgba(59, 30, 109, 0.18)",
      },
      keyframes: {
        "pulse-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "orb-pop": {
          "0%": { transform: "scale(0.9)" },
          "60%": { transform: "scale(1.06)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "pulse-in": "pulse-in 180ms ease-out",
        "orb-pop": "orb-pop 220ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
