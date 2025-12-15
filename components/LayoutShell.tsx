// components/LayoutShell.tsx
"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar"; // あなたの実装に合わせて import

export default function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // ログインページとLPトップではサイドバーを出さない
  const hideSidebar =
    pathname === "/" ||
    pathname === "/login" ||
    pathname?.startsWith("/login/");

  if (hideSidebar) {
    return <>{children}</>;
  }

  // それ以外（管理画面側）は従来どおり
  return (
    <div className="min-h-screen flex">
      <Sidebar showDesktop />
      <div className="flex-1">{children}</div>
    </div>
  );
}
