// app/layout.tsx
import "./globals.css";
import "../styles/global.css";
import { Providers } from "./providers";

export const metadata = {
  title: "ダンススクール管理",
  description: "管理画面",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
