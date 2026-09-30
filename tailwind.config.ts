import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "glitch-after": {
          "0%, 70%": {
            "clip-path": "inset(0 0 0 0)",
            transform: "translate(0, 0)",
            opacity: "0",
          },
          "71%": {
            "clip-path": "inset(24% 0 52% 0)",
            transform: "translate(-2px, 0)",
            opacity: "0.85",
          },
          "74%": {
            "clip-path": "inset(65% 0 12% 0)",
            transform: "translate(1.5px, 0)",
            opacity: "0.9",
          },
          "77%": {
            "clip-path": "inset(10% 0 75% 0)",
            transform: "translate(-1.5px, 0)",
            opacity: "0.85",
          },
          "80%": {
            "clip-path": "inset(0 0 0 0)",
            transform: "translate(0, 0)",
            opacity: "0",
          },
          "88%": {
            "clip-path": "inset(45% 0 35% 0)",
            transform: "translate(-2px, 0)",
            opacity: "0.75",
          },
          "91%": {
            "clip-path": "inset(0 0 0 0)",
            transform: "translate(0, 0)",
            opacity: "0",
          },
          "100%": {
            "clip-path": "inset(0 0 0 0)",
            transform: "translate(0, 0)",
            opacity: "0",
          },
        },
        "glitch-before": {
          "0%, 65%": {
            "clip-path": "inset(0 0 0 0)",
            transform: "translate(0, 0)",
            opacity: "0",
          },
          "66%": {
            "clip-path": "inset(50% 0 30% 0)",
            transform: "translate(2px, 0)",
            opacity: "0.85",
          },
          "69%": {
            "clip-path": "inset(15% 0 65% 0)",
            transform: "translate(-1.5px, 0)",
            opacity: "0.8",
          },
          "72%": {
            "clip-path": "inset(70% 0 8% 0)",
            transform: "translate(2px, 0)",
            opacity: "0.9",
          },
          "75%": {
            "clip-path": "inset(0 0 0 0)",
            transform: "translate(0, 0)",
            opacity: "0",
          },
          "93%": {
            "clip-path": "inset(32% 0 48% 0)",
            transform: "translate(1.5px, 0)",
            opacity: "0.8",
          },
          "96%": {
            "clip-path": "inset(0 0 0 0)",
            transform: "translate(0, 0)",
            opacity: "0",
          },
          "100%": {
            "clip-path": "inset(0 0 0 0)",
            transform: "translate(0, 0)",
            opacity: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "glitch-after": "glitch-after var(--after-duration, 3.5s) infinite ease-in-out",
        "glitch-before": "glitch-before var(--before-duration, 2.8s) infinite ease-in-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
