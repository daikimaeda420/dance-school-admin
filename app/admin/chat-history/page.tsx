"use client"; // ← 必ずファイルの最上部に

// app/admin/chat-history/page.tsx
import { useEffect, useMemo, useState } from "react";
import ChatLogTreeView from "@/components/ChatLogTreeView";
import { TimerReset } from "lucide-react";

type FaqLog = {
  sessionId?: string;
  timestamp: string;
  question: any;
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
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <TimerReset aria-hidden="true" className="w-6 h-6" />
          <span>ユーザーログ</span>
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          セッション数{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {sessionCount}
          </span>{" "}
          ／ ログ件数{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {totalCount}
          </span>
        </p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 animate-pulse text-gray-500 dark:text-gray-400">
            読み込み中...
          </div>
        ) : error ? (
          <div className="p-6 text-red-600 dark:text-red-400">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-sm text-gray-500 dark:text-gray-400">
            まだログがありません
          </div>
        ) : (
          <ChatLogTreeView logs={logs} />
        )}
      </div>
    </div>
  );
}
