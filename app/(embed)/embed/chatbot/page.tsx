// app/(embed)/embed/chatbot/page.tsx
import ChatbotEmbedClient from "./ChatbotEmbedClient";

export default function Page({
  searchParams,
}: {
  searchParams: { school?: string };
}) {
  const school = searchParams.school ?? "";
  return <ChatbotEmbedClient school={school} />;
}
