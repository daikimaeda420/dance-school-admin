// app/(embed)/embed/chatbot/page.tsx
import { Suspense } from "react";
import ChatbotEmbedClient from "./ChatbotEmbedClient";

type PageProps = {
  searchParams: Promise<{
    school?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const sp = await searchParams;
  const school = sp?.school ?? "";
  return (
    <Suspense fallback={null}>
      <ChatbotEmbedClient school={school} />
    </Suspense>
  );
}
