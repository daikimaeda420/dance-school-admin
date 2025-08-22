// basecoat.config.ts
import { defineConfig } from "basecoat";

export default defineConfig({
  theme: {
    color: {
      primary: "#4f46e5", // indigo-600
      secondary: "#06b6d4", // cyan-500
      surface: "#ffffff",
      background: "#f9fafb",
      text: "#111827",
    },
    font: {
      base: "Inter, sans-serif",
    },
    radius: {
      sm: "4px",
      md: "8px",
      lg: "12px",
    },
    spacing: {
      sm: "8px",
      md: "16px",
      lg: "24px",
    },
  },
  output: {
    css: "./styles/basecoat.css",
    tailwind: "./tailwind.basecoat.js",
  },
});
