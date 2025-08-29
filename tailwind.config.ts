import type { Config } from "tailwindcss";
export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg))",
        fg: "hsl(var(--fg))",
        muted: "hsl(var(--muted))",
        border: "hsl(var(--border))",
        brand: "hsl(var(--brand))",
        "brand-alt": "hsl(var(--brand-alt))",
        "brand-foreground": "hsl(var(--brand-foreground))",
        primary: "hsl(var(--brand))",
        "primary-alt": "hsl(var(--brand-alt))"
      }
    }
  },
  plugins: []
} satisfies Config;
