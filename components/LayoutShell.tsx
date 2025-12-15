// components/LayoutShell.tsx
"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import RootShell from "@/app/RootShell"; // ← ここは実際のパスに合わせてOK（元が "./RootShell" なら "@/app/RootShell" でOK）

export default function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();

  const isLoginPage = pathname === "/login" || pathname === "/login/";
  const isTopPage = pathname === "/";

  // ✅ /login は常にヘッダー/サイドバーなし
  if (isLoginPage) return <>{children}</>;

  // ✅ 未ログイン時の / はLP（ヘッダー/サイドバーなし）
  if (isTopPage && status !== "authenticated") return <>{children}</>;

  // ✅ それ以外は管理画面殻（ヘッダー/サイドバーあり）
  return <RootShell>{children}</RootShell>;
}
