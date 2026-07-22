"use client"; // ← 必ずファイルの最上部に

// app/admin/chat-history/page.tsx
import { useEffect, useMemo, useState } from "react";
import ChatLogTreeView from "@/components/ChatLogTreeView";
import { MessageSquareText, TimerReset, Users } from "lucide-react";

type FaqLog = {
  school: string;
  sessionId: string;
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
    const fetchLogs = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams(window.location.search);
        const schoolId = params.get("schoolId") ?? params.get("school") ?? "";
        const query = new URLSearchParams();
        if (schoolId) query.set("schoolId", schoolId);
        const url = `/api/admin/faq-logs${query.toString() ? `?${query.toString()}` : ""}`;

        const res = await fetch(url);

        if (!res.ok) {
          throw new Error(`${res.status} ${res.statusText}`);
        }

        const data: unknown = await res.json();

        // ① /api/logs が配列を返すパターン
        // ② /api/logs が { logs: [...] } を返すパターン
        let normalized: FaqLog[] = [];

        if (Array.isArray(data)) {
          normalized = data as FaqLog[];
        } else if (
          data &&
          typeof data === "object" &&
          Array.isArray((data as any).logs)
        ) {
          normalized = (data as any).logs as FaqLog[];
        }

        // timestamp がある前提で並び替え（新しい順）
        normalized.sort((a, b) => {
          const ta = new Date(a.timestamp).getTime() || 0;
          const tb = new Date(b.timestamp).getTime() || 0;
          return tb - ta;
        });

        setLogs(normalized);
      } catch (err) {
        console.error("ログ取得失敗:", err);
        setError("ログの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const { sessionCount, totalCount } = useMemo(() => {
    const sessions = new Set((logs || []).map((l) => l.sessionId || "unknown"));
    return { sessionCount: sessions.size, totalCount: logs.length };
  }, [logs]);

  return (
    <div className="mx-auto max-w-[1540px] px-4 py-6 text-slate-800 md:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><TimerReset aria-hidden="true" className="h-6 w-6 text-[#fe6147]" />ユーザーログ</h1><p className="mt-1 text-sm text-slate-500">チャットでの会話内容を確認し、Q&Aや導線改善に活かせます。</p></div>
        <div className="flex gap-3"><div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><span className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Users className="h-4 w-4 text-blue-600" />セッション数</span><strong className="mt-1 block text-2xl text-slate-900">{sessionCount}</strong></div><div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><span className="flex items-center gap-2 text-xs font-semibold text-slate-500"><MessageSquareText className="h-4 w-4 text-blue-600" />ログ件数</span><strong className="mt-1 block text-2xl text-slate-900">{totalCount}</strong></div></div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="animate-pulse p-8 text-slate-500">
            読み込み中...
          </div>
        ) : error ? (
          <div className="p-6 text-red-600">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-sm text-slate-500">
            まだログがありません
          </div>
        ) : (
          <ChatLogTreeView logs={logs} />
        )}
      </div>
    </div>
  );
}
