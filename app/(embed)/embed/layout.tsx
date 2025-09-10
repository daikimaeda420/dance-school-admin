// app/(embed)/embed/layout.tsx
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="m-0 min-h-screen bg-transparent text-gray-900">
        {children}
      </body>
    </html>
  );
}
