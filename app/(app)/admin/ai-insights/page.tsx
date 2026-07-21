"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Bot, Lightbulb, TrendingUp, Users, Target, RefreshCw } from "lucide-react";

type Insight = {
  days: number;
  generatedAt: string;
  funnel: { label: string; count: number }[];
  rates: Record<string, number | null>;
  demand: { label: string; count: number; change: number | null }[];
  qaTopics: { label: string; count: number }[];
  suggestions: { title: string; detail: string; priority: "high" | "medium" | "low"; href: string }[];
};

const rateCards = [
  ["diagnosisStartRate", "診断開始率"], ["diagnosisCompletionRate", "診断完了率"], ["formOpenRate", "フォーム到達率"], ["formSubmitRate", "フォーム送信率"], ["overallConversionRate", "総合CV率"],
] as const;

export default function AiInsightsPage() {
  const { data: session, status } = useSession();
  const schoolId = (session?.user as { schoolId?: string } | undefined)?.schoolId;
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/ai-insights?schoolId=${encodeURIComponent(schoolId)}&days=${days}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch { setData(null); } finally { setLoading(false); }
  }, [days, schoolId]);

  useEffect(() => { load(); }, [load]);
  if (status === "loading" || loading) return <p className="p-6">AIコンサル分析を読み込んでいます...</p>;

  return <div className="mx-auto max-w-6xl px-4 py-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold"><Bot className="h-6 w-6 text-violet-600" />AIコンサル・分析</h1><p className="mt-1 text-sm text-gray-600">行動データをもとに、集客から申込までの改善ポイントを提案します。</p></div>
      <div className="flex gap-2"><select className="input" value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={30}>直近30日</option><option value={60}>直近60日</option><option value={90}>直近90日</option></select><button className="btn-ghost" onClick={load}><RefreshCw className="h-4 w-4" />更新</button></div>
    </div>
    {!data ? <div className="card mt-6 p-6 text-sm text-gray-500">分析データを取得できませんでした。</div> : <>
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{rateCards.map(([key, label]) => <div key={key} className="card p-4"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold">{data.rates[key] == null ? "-" : `${data.rates[key]}%`}</p></div>)}</section>
      <section className="card mt-6"><div className="card-header"><h2 className="flex items-center gap-2 font-semibold"><Lightbulb className="h-5 w-5 text-amber-500" />今月の改善提案</h2><p className="text-xs text-gray-500">数値ログを根拠に自動生成しています。</p></div><div className="card-body grid gap-3">{data.suggestions.map((item, index) => <div key={index} className="rounded-lg border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{item.title}</h3><span className={`rounded-full px-2 py-0.5 text-xs ${item.priority === "high" ? "bg-red-50 text-red-700" : item.priority === "medium" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"}`}>{item.priority === "high" ? "優先" : item.priority === "medium" ? "推奨" : "確認"}</span></div><p className="mt-2 text-sm text-gray-600">{item.detail}</p><Link className="mt-2 inline-block text-sm text-blue-600 hover:underline" href={item.href}>設定を確認する →</Link></div>)}</div></section>
      <section className="mt-6 grid gap-6 lg:grid-cols-2"><div className="card"><div className="card-header"><h2 className="flex items-center gap-2 font-semibold"><Target className="h-5 w-5 text-blue-600" />集客ファネル</h2></div><div className="card-body space-y-3">{data.funnel.map((item, index) => <div key={item.label}><div className="flex justify-between text-sm"><span>{item.label}</span><strong>{item.count.toLocaleString()}</strong></div><div className="mt-1 h-2 rounded bg-gray-100"><div className="h-2 rounded bg-blue-500" style={{ width: `${Math.max(4, (item.count / Math.max(1, data.funnel[0].count)) * 100)}%` }} /></div>{index > 0 && <p className="mt-1 text-xs text-gray-500">前段階比 {data.funnel[index - 1].count ? Math.round((item.count / data.funnel[index - 1].count) * 100) : 0}%</p>}</div>)}</div></div>
      <div className="card"><div className="card-header"><h2 className="flex items-center gap-2 font-semibold"><TrendingUp className="h-5 w-5 text-emerald-600" />需要の傾向</h2><p className="text-xs text-gray-500">診断で選ばれたジャンル・目的です。</p></div><div className="card-body">{data.demand.length ? <div className="space-y-3">{data.demand.map((item) => <div key={item.label} className="flex items-center justify-between text-sm"><span>{item.label}</span><span><strong>{item.count}</strong>人 {item.change != null && <em className={item.change >= 0 ? "ml-1 not-italic text-emerald-600" : "ml-1 not-italic text-red-600"}>{item.change >= 0 ? "+" : ""}{item.change}%</em>}</span></div>)}</div> : <p className="text-sm text-gray-500">まだ十分な診断回答データがありません。</p>}</div></div></section>
      <section className="card mt-6"><div className="card-header"><h2 className="flex items-center gap-2 font-semibold"><Users className="h-5 w-5 text-violet-600" />チャットで多い関心</h2></div><div className="card-body">{data.qaTopics.length ? <div className="flex flex-wrap gap-2">{data.qaTopics.map((topic) => <span key={topic.label} className="rounded-full bg-violet-50 px-3 py-1.5 text-sm text-violet-700">{topic.label} <strong>{topic.count}</strong></span>)}</div> : <p className="text-sm text-gray-500">Q&Aログがたまると、関心テーマを表示します。</p>}</div></section>
    </>}
  </div>;
}
