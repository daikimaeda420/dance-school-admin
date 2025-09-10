// app/layout.tsx
import "./globals.css";
import Script from "next/script";
import type { Metadata, Viewport } from "next";
import AuthProvider from "@/components/AuthProvider";
import RootShell from "./RootShell";

export const metadata: Metadata = {
  title: {
    default: "rizbo - ダンススクール専用チャットボットシステム",
    template: "%s | rizbo",
  },
  description: "ダンススクール専用チャットボットシステム",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    other: [
      { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#ff6146" },
    ],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "rizbo",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f19" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">{`
          try {
            var ls = localStorage.getItem("theme");
            var mql = window.matchMedia("(prefers-color-scheme: dark)");
            var dark = ls ? (ls === "dark") : mql.matches;
            if (dark) document.documentElement.classList.add("dark");
          } catch (e) {}
        `}</Script>
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 w-dvw">
        <AuthProvider>
          <RootShell>{children}</RootShell>
        </AuthProvider>
      </body>
    </html>
  );
}
