"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Copy,
  ExternalLink,
  MessageSquareText,
  MousePointerClick,
  Search,
  Trash2,
  Users,
} from "lucide-react";

type SelectOption = { label: string; next?: unknown };
type FaqQuestion = string | { type: "select"; text: string; options: SelectOption[] };
type FaqLog = { sessionId?: string; timestamp: string; question: FaqQuestion; answer?: unknown; url?: string };
type Props = { logs: FaqLog[]; onSessionDeleted?: (sessionId: string) => void };
type Session = { id: string; items: FaqLog[] };

const PAGE_SIZES = [10, 20, 50];
const SESSION_ID_LENGTH = 12;

function parsePayload(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try { return JSON.parse(trimmed); } catch { return value; }
}

function questionText(question: FaqQuestion): string {
  const value = typeof question === "string" ? parsePayload(question) : question;
  if (value && typeof value === "object") {
    const data = value as { type?: string; ctaLabel?: string; question?: string; text?: string };
    if (data.type === "cta") return data.ctaLabel ? `CTAクリック: ${data.ctaLabel}` : "CTAクリック";
    return data.question || data.text || "質問内容を取得できませんでした";
  }
  return String(value || "質問内容を取得できませんでした");
}

function answerText(answer: unknown): string {
  if (answer == null) return "";
  if (typeof answer === "string") return answer;
  try { return JSON.stringify(answer); } catch { return String(answer); }
}

function formatDate(value?: string, includeTime = true) {
  if (!value) return "日時不明";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "日時不明";
  return date.toLocaleString("ja-JP", includeTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });
}

function shortId(id: string) {
  return id.length > SESSION_ID_LENGTH ? `${id.slice(0, SESSION_ID_LENGTH)}…` : id;
}

function StatCard({ icon: Icon, label, value, tone = "blue" }: { icon: typeof Users; label: string; value: number; tone?: "blue" | "orange" | "amber" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-[#fe6147]",
    amber: "bg-amber-50 text-amber-600",
  };
  return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-600">{label}</p><span className={`grid h-9 w-9 place-items-center rounded-lg ${tones[tone]}`}><Icon className="h-4.5 w-4.5" /></span></div>
    <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value.toLocaleString()}</p>
  </article>;
}

function Conversation({ items }: { items: FaqLog[] }) {
  return <ol className="space-y-4 border-l border-slate-200 pl-5">
    {items.slice().reverse().map((log, index) => {
      const answer = answerText(log.answer);
      return <li key={`${log.timestamp}-${index}`} className="relative">
        <span className="absolute -left-[29px] top-2 h-3 w-3 rounded-full border-2 border-white bg-[#fe6147] shadow-sm" />
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2"><p className="text-sm font-semibold text-slate-800">{questionText(log.question)}</p><time className="shrink-0 text-xs text-slate-400">{formatDate(log.timestamp)}</time></div>
          {answer ? <div className="mt-3 rounded-md border border-blue-100 bg-white p-3 text-sm leading-6 text-slate-700"><span className="mr-2 font-semibold text-blue-600">回答</span>{answer}</div> : <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800"><AlertTriangle className="h-3.5 w-3.5" />回答が見つかりません</div>}
          {log.url && <a href={log.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">参照ページを開く <ExternalLink className="h-3 w-3" /></a>}
        </div>
      </li>;
    })}
  </ol>;
}

export default function ChatLogTreeView({ logs, onSessionDeleted }: Props) {
  const sessions = useMemo<Session[]>(() => {
    const map = new Map<string, FaqLog[]>();
    logs.forEach((log) => { const id = log.sessionId || "セッションIDなし"; map.set(id, [...(map.get(id) || []), log]); });
    return Array.from(map, ([id, items]) => ({ id, items: items.toSorted((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) })).toSorted((a, b) => new Date(b.items[0]?.timestamp || 0).getTime() - new Date(a.items[0]?.timestamp || 0).getTime());
  }, [logs]);
  const insights = useMemo(() => {
    const questionCounts = new Map<string, number>(); let ctaClicks = 0; const unanswered: FaqLog[] = [];
    logs.forEach((log) => { const question = questionText(log.question); if (question.startsWith("CTAクリック:" )) { ctaClicks += 1; return; } questionCounts.set(question, (questionCounts.get(question) || 0) + 1); if (!answerText(log.answer).trim()) unanswered.push(log); });
    return { ctaClicks, unanswered, topQuestions: Array.from(questionCounts, ([text, count]) => ({ text, count })).toSorted((a, b) => b.count - a.count).slice(0, 5) };
  }, [logs]);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return sessions;
    return sessions.filter(({ id, items }) => id.toLowerCase().includes(term) || items.some((item) => `${questionText(item.question)} ${answerText(item.answer)}`.toLowerCase().includes(term)));
  }, [query, sessions]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleSessions = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const toggle = (id: string) => setOpenIds((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const copyId = async (id: string) => { await navigator.clipboard.writeText(id); setCopiedId(id); window.setTimeout(() => setCopiedId(null), 1800); };
  const deleteSession = async (id: string) => {
    if (!window.confirm("このセッションのログを削除しますか？この操作は元に戻せません。")) return;
    setDeletingId(id);
    try { const response = await fetch("/api/admin/faq-logs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: id }) }); if (!response.ok) throw new Error(); onSessionDeleted?.(id); } catch { window.alert("削除に失敗しました。時間をおいて再度お試しください。"); } finally { setDeletingId(null); }
  };

  return <div className="space-y-4">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={Users} label="セッション数" value={sessions.length} />
      <StatCard icon={MessageSquareText} label="会話ログ" value={logs.length} />
      <StatCard icon={MousePointerClick} label="CTAクリック" value={insights.ctaClicks} tone="orange" />
      <StatCard icon={AlertTriangle} label="要確認" value={insights.unanswered.length} tone="amber" />
    </section>

    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
          <label className="relative block w-full md:max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} className="input w-full pl-9" placeholder="セッションID・質問・回答を検索" /></label>
          <div className="flex shrink-0 gap-2"><select aria-label="表示件数" className="input py-2 text-sm" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>{PAGE_SIZES.map((size) => <option key={size} value={size}>{size}件表示</option>)}</select><button onClick={() => setOpenIds(new Set(visibleSessions.map((session) => session.id)))} className="btn-ghost text-sm">すべて展開</button></div>
        </div>
        {visibleSessions.length === 0 ? <div className="grid min-h-64 place-items-center px-6 text-center"><div><Search className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-700">該当するセッションがありません</p><p className="mt-1 text-xs text-slate-500">検索キーワードを変更してお試しください。</p></div></div> : <div className="divide-y divide-slate-100">
          {visibleSessions.map((session) => { const opened = openIds.has(session.id); const latest = session.items[0]; return <article key={session.id} className="transition hover:bg-slate-50/70">
            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <button onClick={() => toggle(session.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${opened ? "rotate-180" : ""}`} /><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="text-sm font-bold text-slate-800">{formatDate(latest?.timestamp)}</span><span className="text-xs font-medium text-slate-500">{session.items.length}件の会話</span></div><span title={session.id} className="mt-1 block truncate font-mono text-xs text-slate-400">{shortId(session.id)}</span></div></button>
              <div className="flex shrink-0 items-center gap-2 pl-8 sm:pl-0"><button onClick={() => toggle(session.id)} className="text-sm font-semibold text-[#fe6147] hover:text-[#d9452d]">{opened ? "閉じる" : "会話を確認"}</button><span className="h-4 border-l border-slate-200" /><button aria-label="セッションIDをコピー" onClick={() => copyId(session.id)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700">{copiedId === session.id ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button><button aria-label="セッションを削除" disabled={deletingId === session.id} onClick={() => deleteSession(session.id)} className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button></div>
            </div>
            {opened && <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-5 sm:px-8"><Conversation items={session.items} /></div>}
          </article>; })}
        </div>}
        {filtered.length > 0 && <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm"><p className="text-slate-500">{filtered.length.toLocaleString()}件中 {((currentPage - 1) * pageSize + 1).toLocaleString()}〜{Math.min(currentPage * pageSize, filtered.length).toLocaleString()}件を表示</p><div className="flex items-center gap-2"><button aria-label="前のページ" className="btn-ghost p-2 disabled:opacity-40" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="h-4 w-4" /></button><span className="min-w-14 text-center text-xs font-semibold text-slate-600">{currentPage} / {totalPages}</span><button aria-label="次のページ" className="btn-ghost p-2 disabled:opacity-40" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight className="h-4 w-4" /></button></div></footer>}
      </section>

      <aside className="space-y-4 xl:sticky xl:top-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-bold text-slate-800">よく聞かれた質問</h2><CircleHelp className="h-5 w-5 text-blue-600" /></div>{insights.topQuestions.length ? <ol className="mt-4 divide-y divide-slate-100">{insights.topQuestions.map((item, index) => <li key={item.text} className="grid grid-cols-[24px_1fr_auto] items-start gap-2 py-3 text-sm"><span className="grid h-5 w-5 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">{index + 1}</span><span className="leading-5 text-slate-700">{item.text}</span><span className="text-xs font-semibold text-blue-600">{item.count}件</span></li>)}</ol> : <p className="mt-4 text-sm text-slate-500">まだ質問ログがありません。</p>}</section>
        <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /><h2 className="font-bold text-slate-800">要確認の会話</h2></div><span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-amber-700">{insights.unanswered.length}件</span></div>{insights.unanswered.length ? <ul className="mt-3 divide-y divide-amber-100">{insights.unanswered.slice(0, 5).map((log, index) => <li key={`${log.sessionId}-${log.timestamp}-${index}`} className="py-3"><p className="text-sm font-medium leading-5 text-slate-700">{questionText(log.question)}</p><p className="mt-1 text-xs text-slate-500">{formatDate(log.timestamp)}</p></li>)}</ul> : <p className="mt-3 text-sm leading-6 text-slate-600">回答が見つからない会話はありません。</p>}</section>
      </aside>
    </div>
  </div>;
}
