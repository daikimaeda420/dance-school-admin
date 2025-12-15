"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

export default function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEmbed = pathname.startsWith("/embed"); // /embed 配下はヘッダ/フッタ非表示
  const isLoginPage = pathname === "/login"; // ← 追加：ログインページ判定

  // 埋め込みページは中身だけ描画
  if (isEmbed) {
    return <>{children}</>;
  }

  // 通常ページ
  return (
    <>
      <Header />
      <div className="mx-auto">
        <div className="flex gap-6">
          {/* /login のときは Sidebar を非表示 */}
          {!isLoginPage && <Sidebar showDesktop />}
          <div className="flex-1 w-full min-h-[calc(100vh-4rem)]">
            <main className="min-h-[87vh] py-6">{children}</main>
            <Footer siteName="Rizbo" startYear={2025} />
          </div>
        </div>
      </div>
    </>
  );
}
