// app/(embed)/embed/chatbot/page.tsx
import ChatbotEmbedClient from "./ChatbotEmbedClient";

// （必要に応じてSSRキャッシュ無効化したいなら）
// export const revalidate = 0;

export default function ChatbotEmbedPage() {
  return (
    <div style={{ minHeight: "100dvh" }}>
      <ChatbotEmbedClient />
    </div>
  );
}
