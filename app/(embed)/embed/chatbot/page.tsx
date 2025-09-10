// app/(embed)/embed/chatbot/page.tsx
import { Suspense } from "react";
import ChatbotEmbedClient from "./ChatbotEmbedClient";

// 事前レンダリングを避ける（検索パラメータ依存のため）
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ChatbotEmbedPage() {
  return (
    <div style={{ minHeight: "100dvh" }}>
      {/* useSearchParams を使うクライアント子は Suspense で包む */}
      <Suspense fallback={null}>
        <ChatbotEmbedClient />
      </Suspense>
    </div>
  );
}
