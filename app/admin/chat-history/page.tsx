// app/admin/chat-history/page.tsx
"use client";

import { useEffect, useState } from "react";
import ChatLogTreeView from "@/components/ChatLogTreeView";

type FaqLog = {
  sessionId?: string;
  timestamp: string;
  question: string;
  answer?: string;
  url?: string;
};

export default function ChatHistoryPage() {
  const [logs, setLogs] = useState<FaqLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/logs")
      .then((res) => res.json())
      .then((data) => {
        setLogs(data); // ←ここでログをセット
        setLoading(false);
      })
      .catch((err) => {
        console.error("ログ取得失敗:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        💬 チャット履歴（セッション別）
      </h1>
      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : (
        <ChatLogTreeView logs={logs} />
      )}
    </div>
  );
}
