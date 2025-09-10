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
        <style jsx global>{`
          html,
          body {
            height: 100%;
            margin: 0;
          }
        `}</style>
      </body>
    </html>
  );
}
