// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Dance School Admin",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <AuthProvider>
          <Header />
          <div className="mx-auto px-4">
            <div className="flex gap-6">
              {/* ← デスクトップ（md以上）でのみ表示。Header側はモバイルドロワーのみ */}
              <Sidebar showDesktop />
              <main className="flex-1 min-h-[calc(100vh-4rem)] py-6">
                {children}
              </main>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
