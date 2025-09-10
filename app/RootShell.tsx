"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

export default function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEmbed = pathname.startsWith("/embed"); // /embed 配下はヘッダ/フッタ非表示

  if (isEmbed) {
    // 埋め込みページは中身だけ描画
    return <>{children}</>;
  }

  // 通常ページは従来の枠で描画
  return (
    <>
      <Header />
      <div className="mx-auto px-4">
        <div className="flex gap-6">
          <Sidebar showDesktop />
          <div className="flex-1 w-full min-h-[calc(100vh-4rem)]">
            <main className="min-h-[87vh] py-6">{children}</main>
            <Footer siteName="Rizbo" startYear={2025} />
          </div>
        </div>
      </div>
    </>
  );
}
