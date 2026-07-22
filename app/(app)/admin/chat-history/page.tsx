"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, TimerReset } from "lucide-react";
import ChatLogTreeView from "@/components/ChatLogTreeView";

type FaqLog = { school: string; sessionId: string; timestamp: string; question: any; answer?: unknown; url?: string };

export default function ChatHistoryPage() {
  const [logs, setLogs] = useState<FaqLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams(window.location.search);
      const schoolId = params.get("schoolId") ?? params.get("school") ?? "";
      const response = await fetch(`/api/admin/faq-logs${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ""}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data: unknown = await response.json();
      const normalized = Array.isArray(data) ? data as FaqLog[] : data && typeof data === "object" && Array.isArray((data as { logs?: unknown[] }).logs) ? (data as { logs: FaqLog[] }).logs : [];
      setLogs(normalized.toSorted((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch { setError("ログの取得に失敗しました。時間をおいて再度お試しください。"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  return <div className="mx-auto max-w-[1540px] px-4 py-6 text-slate-800 md:px-6">
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><TimerReset aria-hidden className="h-6 w-6 text-[#fe6147]" />ユーザーログ</h1><p className="mt-1 text-sm text-slate-500">チャットでの会話内容を確認し、Q&Aや導線改善に活かせます。</p></div>
      <button onClick={loadLogs} disabled={loading} className="btn-ghost inline-flex w-fit items-center gap-2 text-sm"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />更新</button>
    </div>
    {loading ? <div className="grid min-h-80 place-items-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500 shadow-sm"><span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin text-[#fe6147]" />ログを読み込んでいます...</span></div> : error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700"><p>{error}</p><button onClick={loadLogs} className="mt-3 font-semibold underline">再読み込み</button></div> : logs.length === 0 ? <div className="grid min-h-80 place-items-center rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm"><div><TimerReset className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">まだ会話ログがありません</p><p className="mt-1 text-sm text-slate-500">チャットの利用が始まると、ここで会話内容を確認できます。</p></div></div> : <ChatLogTreeView logs={logs} onSessionDeleted={(sessionId) => setLogs((current) => current.filter((log) => log.sessionId !== sessionId))} />}
  </div>;
}
