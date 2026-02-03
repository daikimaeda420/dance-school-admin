// app/(embed)/embed/layout.tsx
"use client";

import { useEffect } from "react";

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // ✅ 埋め込み（お客さんサイト）では dark を使わない
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
    return () => {
      document.documentElement.style.colorScheme = "";
    };
  }, []);

  // ✅ 埋め込み用の土台（余白ゼロ・横はみ出し防止）
  return (
    <div className="w-full bg-white text-gray-900 overflow-x-hidden">
      {children}
    </div>
  );
}
