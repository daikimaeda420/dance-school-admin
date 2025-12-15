// components/LayoutShell.tsx
"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/Sidebar";

export default function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();

  const isLoginPage = pathname === "/login" || pathname === "/login/";
  const isTopPage = pathname === "/";

  // ✅ /login は常にサイドバー無し
  if (isLoginPage) return <>{children}</>;

  // ✅ 未ログイン時の / はLP扱い（サイドバー・ヘッダー無し）
  if (isTopPage && status !== "authenticated") return <>{children}</>;

  // ✅ それ以外（ログイン中の / を含む）は管理画面レイアウト
  return (
    <div className="min-h-screen flex">
      <Sidebar showDesktop />
      <div className="flex-1">{children}</div>
    </div>
  );
}
