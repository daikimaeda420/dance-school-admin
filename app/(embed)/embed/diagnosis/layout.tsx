"use client";

import { useEffect } from "react";

export default function DiagnosisEmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // ✅ 診断（埋め込み）では dark を使わない：強制的に無効化
    document.documentElement.classList.remove("dark");
    // iOS Safari などの自動ダーク対策
    document.documentElement.style.colorScheme = "light";

    return () => {
      document.documentElement.style.colorScheme = "";
    };
  }, []);

  // ✅ 埋め込み用のベース（必要なら padding/overflow もここで）
  return <div className="bg-white text-gray-900">{children}</div>;
}
