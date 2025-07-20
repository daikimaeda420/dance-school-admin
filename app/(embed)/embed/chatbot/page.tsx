import { Suspense } from "react";
import ChatbotEmbedClient from "./ChatbotEmbedClient";

export default function ChatbotEmbedPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <ChatbotEmbedClient />
    </Suspense>
  );
}
