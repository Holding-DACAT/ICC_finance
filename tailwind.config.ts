import type { Config } from "tailwindcss";

/**
 * Thème ICC Finance — indigo / orange (voir docs/03_CHARTE_UI.md).
 * Toutes les couleurs passent par des variables CSS (cf. globals.css) :
 * aucun hex en dur dans les composants.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tokens shadcn (mappés sur le thème indigo)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        // Tokens métier ICC Finance (charte)
        brand: {
          bg: "hsl(var(--brand-bg))",
          sidebar: "hsl(var(--brand-sidebar))",
          card: "hsl(var(--brand-card))",
          "card-soft": "hsl(var(--brand-card-soft))",
        },
        kpi: {
          orange: "hsl(var(--kpi-orange))",
          pink: "hsl(var(--kpi-pink))",
          green: "hsl(var(--kpi-green))",
          blue: "hsl(var(--kpi-blue))",
        },
        state: {
          success: "hsl(var(--state-success))",
          warning: "hsl(var(--state-warning))",
          danger: "hsl(var(--state-danger))",
          info: "hsl(var(--state-info))",
        },
        "text-soft": "hsl(var(--text-soft))",
        "text-faint": "hsl(var(--text-faint))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
