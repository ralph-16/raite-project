import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  /* Theme class is written to <html> from `kl.theme` before first paint. */
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        /* Inter for everything. display/body/mono kept as aliases so
           existing `font-display` / `font-body` / `font-mono` classes
           keep working and all render as Inter. */
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-sans)", "system-ui", "sans-serif"],
        body: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          foreground: "hsl(var(--success-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        /* Ka-Lakbay palette — fixed, do not add, shift, or substitute. */
        "lory-blue": "hsl(var(--lory-blue) / <alpha-value>)",
        "lory-yellow": "hsl(var(--lory-yellow) / <alpha-value>)",
        "lory-pink": "hsl(var(--lory-pink) / <alpha-value>)",
        "lory-hot-pink": "hsl(var(--lory-hot-pink) / <alpha-value>)",
        "lory-magenta": "hsl(var(--lory-magenta) / <alpha-value>)",
        "lory-green": "hsl(var(--lory-green) / <alpha-value>)",
        "lory-burgundy": "hsl(var(--lory-burgundy) / <alpha-value>)",
        "lory-taffy": "hsl(var(--lory-taffy) / <alpha-value>)",
        "lory-vinyl": "hsl(var(--lory-vinyl) / <alpha-value>)",
        "accent-primary": "hsl(var(--accent-primary) / <alpha-value>)",
        "accent-highlight": "hsl(var(--accent-highlight) / <alpha-value>)",
        /* Text-only inks (surfaces use accent-primary / accent-highlight). */
        "accent-ink": "hsl(var(--accent-ink) / <alpha-value>)",
        "highlight-ink": "hsl(var(--highlight-ink) / <alpha-value>)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        /* RETIRED per AGENTS.md §8: lory-float and gel-wiggle must never be
           used as ambient always-on motion. Keyframes kept only in case a
           specific intentional moment needs them. */
        "lory-float": {
          "0%, 100%": { transform: "translateY(0) rotate(-2deg)" },
          "50%": { transform: "translateY(-8px) rotate(2deg)" },
        },
        "gel-wiggle": {
          "0%, 100%": { transform: "scale(1) rotate(0deg)" },
          "50%": { transform: "scale(1.02) rotate(1.5deg)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
        /* Layer-jump step transitions: outgoing layer leaves, next springs in. */
        "step-in-next": {
          "0%": { opacity: "0", transform: "translateX(28px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "step-in-prev": {
          "0%": { opacity: "0", transform: "translateX(-28px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pop-in": {
          "0%": { transform: "scale(0)" },
          "60%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)" },
        },
        /* One orchestrated landing entrance: rise in, then rest (§8). */
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        /* RETIRED per AGENTS.md §8: no ambient lory-float / gel-wiggle entries.
           Use shimmer, step-in-next/prev, pop-in only. */
        shimmer: "shimmer 1.8s ease-in-out infinite",
        "step-in-next": "step-in-next 320ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "step-in-prev": "step-in-prev 320ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "pop-in": "pop-in 420ms ease-out both",
        /* Staggered via inline `animation-delay` — delays collapse to 0 under
           prefers-reduced-motion (see globals.css). */
        "rise-in": "rise-in 620ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
