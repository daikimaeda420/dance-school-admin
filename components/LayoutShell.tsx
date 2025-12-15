// components/LayoutShell.tsx
"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import Sidebar from "@/components/Sidebar"; // ✅ default import に修正

export default function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // LPトップとログインページではサイドバーを出さない
  const hideSidebar =
    pathname === "/" || pathname === "/login" || pathname === "/login/";

  if (hideSidebar) return <>{children}</>;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar 側の props 名に合わせて調整（あなたの Sidebar は showDesktop を持ってる想定） */}
      <Sidebar showDesktop />
      <div className="flex-1">{children}</div>
    </div>
  );
}
