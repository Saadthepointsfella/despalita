// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--mm-bg) / <alpha-value>)",
        panel: "rgb(var(--mm-panel) / <alpha-value>)",
        border: "rgb(var(--mm-border) / <alpha-value>)",
        text: "rgb(var(--mm-text) / <alpha-value>)",
        muted: "rgb(var(--mm-muted) / <alpha-value>)",
        accent: "rgb(var(--mm-accent) / <alpha-value>)",

        level: {
          1: "#ef4444", // red
          2: "#f97316", // orange
          3: "#eab308", // yellow
          4: "#22c55e", // green
          5: "#3b82f6", // blue
        },
      },
      letterSpacing: {
        headline: "-0.03em",
      },
    },
  },
  plugins: [],
} satisfies Config;
