import "./globals.css";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = { title: "Dance School Admin" };

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
          <div className="flex">
            <Sidebar />
            <main className="flex-1 p-4 lg:p-8">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
