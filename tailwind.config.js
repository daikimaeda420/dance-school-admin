// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  darkMode: "class", // ← 念のため明示
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // （必要ならカスタム色やshadowなどここに）
    },
  },
  // 🔧 2階層以降で使う動的クラスを safelist に登録
  safelist: [
    // bg（淡色）
    "bg-emerald-50","bg-sky-50","bg-rose-50","bg-indigo-50","bg-amber-50",
    // border（淡色）
    "border-emerald-300","border-sky-300","border-rose-300","border-indigo-300","border-amber-300",

    // dark 背景（/12 or /30 を明示）※ファイル内で使っている方に合わせてください
    "dark:bg-emerald-900/12","dark:bg-sky-900/12","dark:bg-rose-900/12","dark:bg-indigo-900/12","dark:bg-amber-900/12",
    "dark:bg-emerald-900/30","dark:bg-sky-900/30","dark:bg-rose-900/30","dark:bg-indigo-900/30","dark:bg-amber-900/30",

    // dark 枠線
    "dark:border-emerald-700","dark:border-sky-700","dark:border-rose-700","dark:border-indigo-700","dark:border-amber-700",,
  ],
} satisfies Config;
