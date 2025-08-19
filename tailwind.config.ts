import type { Config } from "tailwindcss";
export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: {
      bg: "hsl(var(--bg))",
      fg: "hsl(var(--fg))",
      muted: "hsl(var(--muted))",
      border: "hsl(var(--border))"
    }
  }},
  plugins: []
} satisfies Config;
