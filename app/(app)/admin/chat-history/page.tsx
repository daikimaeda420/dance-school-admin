"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Search, TimerReset } from "lucide-react";
import ChatLogTreeView from "@/components/ChatLogTreeView";

type FaqLog = { school: string; sessionId: string; timestamp: string; question: any; answer?: unknown; url?: string };

export default function ChatHistoryPage() {
  const [logs, setLogs] = useState<FaqLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async (nextPage = page, nextQuery = query) => {
    setLoading(true); setError(null);
    try {
      const locationParams = new URLSearchParams(window.location.search);
      const schoolId = locationParams.get("schoolId") ?? locationParams.get("school") ?? "";
      const requestParams = new URLSearchParams();
      if (schoolId) requestParams.set("schoolId", schoolId);
      requestParams.set("page", String(nextPage));
      requestParams.set("pageSize", "50");
      if (nextQuery) requestParams.set("query", nextQuery);
      const response = await fetch(`/api/admin/faq-logs?${requestParams.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data: unknown = await response.json();
      const result = data && typeof data === "object" ? data as { logs?: FaqLog[]; total?: number; page?: number } : null;
      const normalized = Array.isArray(result?.logs) ? result.logs : [];
      setLogs(normalized.toSorted((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      setTotal(Number(result?.total ?? 0));
      setPage(Number(result?.page ?? nextPage));
    } catch { setError("ログの取得に失敗しました。時間をおいて再度お試しください。"); }
    finally { setLoading(false); }
  }, [page, query]);

  useEffect(() => { loadLogs(1, query); }, [query]);

  const totalPages = Math.max(1, Math.ceil(total / 50));
  const applySearch = () => setQuery(searchDraft.trim());

  return <div className="mx-auto max-w-[1540px] px-4 py-6 text-slate-800 md:px-6">
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><TimerReset aria-hidden className="h-6 w-6 text-[#fe6147]" />ユーザーログ</h1><p className="mt-1 text-sm text-slate-500">チャットでの会話内容を確認し、Q&Aや導線改善に活かせます。</p></div>
      <button onClick={() => loadLogs()} disabled={loading} className="btn-ghost inline-flex w-fit items-center gap-2 text-sm"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />更新</button>
    </div>
    <form onSubmit={(event) => { event.preventDefault(); applySearch(); }} className="mb-4 flex gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><label className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} className="input w-full pl-9" placeholder="セッションID・質問・回答を検索" /></label><button className="btn-ghost shrink-0" type="submit">検索</button></form>
    {loading ? <div className="grid min-h-80 place-items-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500 shadow-sm"><span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin text-[#fe6147]" />ログを読み込んでいます...</span></div> : error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700"><p>{error}</p><button onClick={() => loadLogs()} className="mt-3 font-semibold underline">再読み込み</button></div> : logs.length === 0 ? <div className="grid min-h-80 place-items-center rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm"><div><TimerReset className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">該当する会話ログはありません</p><p className="mt-1 text-sm text-slate-500">検索条件を変更してお試しください。</p></div></div> : <><ChatLogTreeView logs={logs} onSessionDeleted={(sessionId) => { setLogs((current) => current.filter((log) => log.sessionId !== sessionId)); setTotal((current) => Math.max(0, current - 1)); }} /><footer className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"><span className="text-slate-500">全{total.toLocaleString()}件中 {((page - 1) * 50 + 1).toLocaleString()}〜{Math.min(page * 50, total).toLocaleString()}件</span><div className="flex items-center gap-2"><button className="btn-ghost p-2 disabled:opacity-40" aria-label="前のページ" disabled={page <= 1} onClick={() => loadLogs(page - 1)}><ChevronLeft className="h-4 w-4" /></button><span className="min-w-14 text-center text-xs font-semibold">{page} / {totalPages}</span><button className="btn-ghost p-2 disabled:opacity-40" aria-label="次のページ" disabled={page >= totalPages} onClick={() => loadLogs(page + 1)}><ChevronRight className="h-4 w-4" /></button></div></footer></>}
  </div>;
}
