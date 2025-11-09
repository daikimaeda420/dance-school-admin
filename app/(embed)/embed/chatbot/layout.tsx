// app/(embed)/embed/chatbot/layout.tsx
export const metadata = {
  title: "Q&Aチャット埋め込み",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, background: "#0a0a0a" }}>{children}</body>
    </html>
  );
}
