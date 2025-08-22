"use client";

import { useEffect, useMemo, useState } from "react";
import ChatLogTreeView from "@/components/ChatLogTreeView";

type FaqLog = {
  sessionId?: string;
  timestamp: string;
  question: any; // 文字列 or { type:"select", text, options... }
  answer?: any;
  url?: string;
};

export default function ChatHistoryPage() {
  const [logs, setLogs] = useState<FaqLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/logs")
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("ログ取得失敗:", err);
        setError("ログの取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, []);

  const { sessionCount, totalCount } = useMemo(() => {
    const sessions = new Set((logs || []).map((l) => l.sessionId || "unknown"));
    return { sessionCount: sessions.size, totalCount: logs.length };
  }, [logs]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">💬 チャット履歴（セッション別）</h1>
        <p className="mt-1 text-sm text-gray-600">
          セッション数{" "}
          <span className="font-semibold text-gray-900">{sessionCount}</span> ／
          ログ件数{" "}
          <span className="font-semibold text-gray-900">{totalCount}</span>
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-soft">
        {loading ? (
          <div className="p-8 animate-pulse text-gray-500">読み込み中...</div>
        ) : error ? (
          <div className="p-6 text-red-600">{error}</div>
        ) : (
          <ChatLogTreeView logs={logs} />
        )}
      </div>
    </div>
  );
}
