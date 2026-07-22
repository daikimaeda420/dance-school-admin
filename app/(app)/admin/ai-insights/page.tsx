"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Bot, Lightbulb, TrendingUp, Users, Target, RefreshCw, Printer, BrainCircuit, ArrowUpRight } from "lucide-react";

type Insight = {
  days: number;
  generatedAt: string;
  funnel: { label: string; count: number }[];
  dropoffs: { label: string; dropoffRate: number | null; reason: string }[];
  rates: Record<string, number | null>;
  demand: { label: string; count: number; change: number | null }[];
  qaTopics: { label: string; count: number }[];
  suggestions: { title: string; detail: string; priority: "high" | "medium" | "low"; href: string }[];
};

const KPI_CONFIG = [
  ["診断開始数", "diagnosisStartRate", "開始率", "bg-blue-50 text-blue-700"],
  ["診断完了率", "diagnosisCompletionRate", "完了率", "bg-violet-50 text-violet-700"],
  ["フォーム到達率", "formOpenRate", "到達率", "bg-cyan-50 text-cyan-700"],
  ["体験予約率", "overallConversionRate", "総合CV", "bg-emerald-50 text-emerald-700"],
] as const;

function rate(value: number | null | undefined) { return value == null ? "–" : `${value}%`; }

export default function AiInsightsPage() {
  const { data: session, status } = useSession();
  const schoolId = (session?.user as { schoolId?: string } | undefined)?.schoolId;
  const reportName = (session?.user as { name?: string } | undefined)?.name || "スクール";
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

  const funnelMax = useMemo(() => Math.max(1, ...(data?.funnel.map((item) => item.count) ?? [1])), [data]);
  if (status === "loading" || loading) return <p className="p-6">AIコンサル分析を読み込んでいます...</p>;

  return <div className="ai-report mx-auto max-w-[1480px] px-4 py-6 text-slate-800">
    <style jsx global>{`
      @media print { aside, header, .no-print { display:none !important; } body { background:#fff !important; } .ai-report { max-width:none !important; padding:0 !important; } .report-panel { break-inside:avoid; box-shadow:none !important; } a { color:inherit !important; text-decoration:none !important; } }
    `}</style>
    <div className="no-print mb-5 flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><Bot className="h-6 w-6 text-violet-600" />AIコンサル・分析</h1><p className="mt-1 text-sm text-slate-500">データから離脱要因・需要・体験予約の伸ばし方を提案します。</p></div>
      <div className="flex flex-wrap gap-2"><select className="input h-10" value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={30}>直近30日</option><option value={60}>直近60日</option><option value={90}>直近90日</option></select><button className="btn-ghost" onClick={load}><RefreshCw className="h-4 w-4" />更新</button><button className="btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" />PDF保存・印刷</button></div>
    </div>
    {!data ? <div className="report-panel rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">分析データを取得できませんでした。</div> : <>
      <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-4"><p className="text-sm font-semibold text-violet-600">RIZBO ANALYTICS REPORT</p><h1 className="mt-1 text-2xl font-bold">{reportName}｜集客・体験予約 改善レポート</h1><p className="mt-2 text-sm text-slate-500">対象期間：直近{data.days}日 ／ 作成日：{new Date(data.generatedAt).toLocaleDateString("ja-JP")}</p></div>
      <div className="mb-4 rounded-xl bg-slate-900 px-5 py-3 text-base font-bold text-white">管理画面・分析ダッシュボード</div>
      <div className="grid gap-4 xl:grid-cols-[1.15fr_1.15fr_1.15fr_.85fr]">
        <section className="report-panel overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white px-5 py-4"><h2 className="flex items-center gap-2 font-bold"><span className="grid h-7 w-7 place-items-center rounded-md bg-blue-600 text-sm text-white">1</span>離脱理由の分析</h2><p className="mt-1 text-xs text-slate-500">どこで、なぜ離脱しているかを自動分析</p></div>
          <div className="p-4"><table className="w-full text-left text-xs"><thead className="border-b text-slate-400"><tr><th className="pb-2 font-medium">離脱ポイント</th><th className="pb-2 font-medium">離脱率</th><th className="pb-2 font-medium">主な要因（AI推定）</th></tr></thead><tbody>{data.dropoffs.length ? data.dropoffs.map((item) => <tr key={item.label} className="border-b border-slate-100 last:border-0"><td className="py-3 font-medium text-slate-700">{item.label}</td><td className="py-3 font-bold text-blue-700">{rate(item.dropoffRate)}</td><td className="py-3 leading-5 text-slate-500">{item.reason}</td></tr>) : <tr><td colSpan={3} className="py-6 text-center text-slate-400">データを蓄積中です</td></tr>}</tbody></table>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3"><div className="flex gap-2"><BrainCircuit className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><div><p className="text-xs font-bold text-amber-800">AIの示唆</p><p className="mt-1 text-xs leading-5 text-amber-900">最も離脱の大きい地点に、安心材料・選択肢の補足・次に進むメリットを先回りして表示しましょう。</p></div></div></div></div>
        </section>

        <section className="report-panel overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white px-5 py-4"><h2 className="flex items-center gap-2 font-bold"><span className="grid h-7 w-7 place-items-center rounded-md bg-violet-600 text-sm text-white">2</span>需要トレンドの可視化</h2><p className="mt-1 text-xs text-slate-500">今、どんなニーズが増えているかを把握</p></div><div className="p-4"><p className="mb-3 text-xs font-semibold text-slate-600">ジャンル・目的別の希望割合</p>{data.demand.length ? <div className="space-y-3">{data.demand.map((item, index) => <div key={item.label}><div className="mb-1 flex justify-between gap-2 text-xs"><span className="truncate text-slate-600">{item.label}</span><span className="shrink-0 font-bold">{item.count}人 {item.change != null && <em className={item.change >= 0 ? "ml-1 not-italic text-emerald-600" : "ml-1 not-italic text-rose-600"}>{item.change >= 0 ? "+" : ""}{item.change}%</em>}</span></div><div className="h-2.5 rounded-full bg-slate-100"><div className={["h-2.5 rounded-full", ["bg-violet-500","bg-blue-500","bg-emerald-500","bg-amber-500","bg-fuchsia-400","bg-cyan-500"][index % 6]].join(" ")} style={{ width: `${Math.max(5, item.count / Math.max(1, data.demand[0].count) * 100)}%` }} /></div></div>)}</div> : <p className="py-8 text-center text-sm text-slate-400">診断回答データを蓄積中です</p>}<div className="mt-5 rounded-lg border border-violet-200 bg-violet-50 p-3 text-xs leading-5 text-violet-900"><Lightbulb className="mr-1 inline h-4 w-4 text-violet-600" />増加傾向のジャンルは、LPの冒頭・SNS投稿・チャット初期選択肢で強調すると効果的です。</div></div></section>

        <section className="report-panel overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white px-5 py-4"><h2 className="flex items-center gap-2 font-bold"><span className="grid h-7 w-7 place-items-center rounded-md bg-emerald-600 text-sm text-white">3</span>予約・診断の成果指標</h2><p className="mt-1 text-xs text-slate-500">スクールごとのKPIをリアルタイム確認</p></div><div className="p-4"><div className="grid grid-cols-2 gap-2">{KPI_CONFIG.map(([title,key,caption,tone], index) => <div key={key} className={`rounded-lg p-3 ${tone}`}><p className="text-[11px] font-medium opacity-75">{title}</p><p className="mt-1 text-2xl font-bold">{index === 0 ? data.funnel[1]?.count.toLocaleString() ?? "0" : rate(data.rates[key])}</p><p className="mt-1 text-[10px] opacity-70">{caption}</p></div>)}</div><div className="mt-5"><p className="mb-3 text-xs font-semibold text-slate-600">体験予約までの流れ</p><div className="space-y-2">{data.funnel.map((item, index) => <div key={item.label} className="grid grid-cols-[84px_1fr_36px] items-center gap-2 text-[11px]"><span className="text-slate-500">{item.label}</span><div className="h-3 rounded bg-slate-100"><div className="h-3 rounded bg-emerald-500" style={{ width: `${Math.max(3, item.count / funnelMax * 100)}%` }} /></div><strong className="text-right text-slate-700">{item.count}</strong></div>)}</div></div></div></section>

        <section className="report-panel overflow-hidden rounded-xl border border-violet-100 bg-gradient-to-b from-violet-50/70 to-white shadow-sm"><div className="border-b border-violet-100 px-5 py-4"><h2 className="flex items-center gap-2 font-bold text-violet-900"><BrainCircuit className="h-5 w-5" />改善提案レポート</h2><p className="mt-1 text-xs text-violet-700">データから次の打ち手を具体化</p></div><div className="space-y-3 p-3">{data.suggestions.slice(0, 4).map((item, index) => <article key={index} className="rounded-lg border border-white bg-white p-3 shadow-sm"><div className="flex gap-2"><span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.priority === "high" ? "bg-rose-500" : item.priority === "medium" ? "bg-amber-400" : "bg-emerald-500"}`} /><div><h3 className="text-sm font-bold text-slate-800">{item.title}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</p><Link href={item.href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:underline">設定を確認 <ArrowUpRight className="h-3 w-3" /></Link></div></div></article>)}</div><div className="mx-3 mb-3 rounded-lg bg-violet-600 p-3 text-center text-xs font-semibold text-white">改善提案の実行支援も可能です</div></section>
      </div>
      <section className="report-panel mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-blue-600" /><h2 className="font-bold">チャットで多い関心</h2><span className="text-xs text-slate-400">よく聞かれる内容を、LPや初期選択肢へ反映</span></div>{data.qaTopics.length ? <div className="mt-3 flex flex-wrap gap-2">{data.qaTopics.map((topic) => <span key={topic.label} className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800">{topic.label} <b className="ml-1">{topic.count}</b></span>)}</div> : <p className="mt-3 text-sm text-slate-400">Q&Aログがたまると関心テーマを表示します。</p>}</section>
    </>}
  </div>;
}
