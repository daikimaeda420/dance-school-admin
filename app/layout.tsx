import SessionProviderClient from "@/components/SessionProviderClient";
import Header from "@/components/Header";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <SessionProviderClient>
          <Header />
          {children}
        </SessionProviderClient>
      </body>
    </html>
  );
}
