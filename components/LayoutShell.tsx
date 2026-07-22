// components/LayoutShell.tsx
"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

export default function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();

  const isLoginPage = pathname === "/login" || pathname === "/login/";
  const isTopPage = pathname === "/";

  // ✅ /login は常にヘッダー/サイドバーなし
  if (isLoginPage) return <>{children}</>;

  // ✅ 未ログイン時の / はLP（ヘッダー/サイドバーなし）
  if (isTopPage && status !== "authenticated") return <>{children}</>;

  // ✅ それ以外は管理画面殻（ヘッダー + サイドバー + コンテンツ）
  return (
    <>
      <Header />
      <div className="flex min-h-[calc(100vh-4rem)] pt-16 bg-[#f8fafc]">
        {/* デスクトップ用サイドバー（md以上で表示） */}
        <Sidebar showDesktop />
        <main className="flex-1 min-w-0 bg-[#f8fafc]">{children}</main>
      </div>
    </>
  );
}
