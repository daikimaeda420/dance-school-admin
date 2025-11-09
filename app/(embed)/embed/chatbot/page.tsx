// app/(embed)/embed/chatbot/page.tsx
import ChatbotEmbedClient from "./ChatbotEmbedClient";

type PageProps = {
  searchParams?: {
    school?: string;
  };
};

export default function Page({ searchParams }: PageProps) {
  const school = searchParams?.school ?? "";
  return <ChatbotEmbedClient school={school} />;
}
