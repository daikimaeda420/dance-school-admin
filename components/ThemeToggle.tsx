"use client";

import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "theme"; // "dark" | "light" | null(=未設定=OS優先)

function getInitialDark(): boolean {
  try {
    const ls = localStorage.getItem(KEY);
    if (ls === "dark") return true;
    if (ls === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

function applyDark(dark: boolean, persist = true) {
  document.documentElement.classList.toggle("dark", dark);
  if (persist) {
    try {
      localStorage.setItem(KEY, dark ? "dark" : "light");
    } catch {}
  }
}

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  // 初期化（マウント時）
  useEffect(() => {
    const dark = getInitialDark();
    document.documentElement.classList.toggle("dark", dark);
    setIsDark(dark);
  }, []);

  // 他タブでの変更を同期
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      const dark =
        e.newValue === "dark" ||
        (e.newValue == null &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
      setIsDark(dark);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    applyDark(next, true); // localStorageへ保存
  };

  return (
    <button
      onClick={toggle}
      type="button"
      aria-label={isDark ? "ライトモードに切替" : "ダークモードに切替"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="grid h-10 w-10 place-items-center rounded-md border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
