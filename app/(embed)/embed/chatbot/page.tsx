import dynamic from "next/dynamic";

const ChatbotEmbedClient = dynamic(() => import("./ChatbotEmbedClient"), {
  ssr: false,
});

export default function Page() {
  return <ChatbotEmbedClient />;
}
