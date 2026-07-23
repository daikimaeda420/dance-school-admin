"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ArrowRight, BrainCircuit, CheckCircle2, ChevronRight, ClipboardCheck,
  Lightbulb, LoaderCircle, RefreshCw, Sparkles, TrendingUp, Users, WandSparkles,
  X,
} from "lucide-react";

type ActionKey = "PROMOTE_DEMAND_GENRE" | "SIMPLIFY_FORM" | "ADD_FAQ";
type MetricKey = "diagnosisStartRate" | "diagnosisCompletionRate" | "formSubmitRate" | "overallConversionRate";

type Suggestion = {
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
  href: string;
  action?: ActionKey;
  payload?: Record<string, string>;
};

export type Insight = {
  days: number;
  generatedAt: string;
  funnel: { label: string; count: number }[];
  dropoffs: { label: string; dropoffRate: number | null; reason: string }[];
  rates: Record<MetricKey, number | null>;
  demand: { slug: string; label: string; count: number; change: number | null }[];
  qaTopics: { label: string; count: number }[];
  suggestions: Suggestion[];
  improvements: Improvement[];
};

type Improvement = {
  id: string;
  actionKey: ActionKey;
  title: string;
  summary: string;
  metricKey: MetricKey | null;
  baselineValue: number | null;
  appliedAt: string;
};

const metricLabels: Record<MetricKey, string> = {
  diagnosisStartRate: "診断開始率",
  diagnosisCompletionRate: "診断完了率",
  formSubmitRate: "フォーム送信率",
  overallConversionRate: "体験予約率",
};

function rate(value: number | null | undefined) {
  return value == null ? "–" : `${value}%`;
}

function metricFor(action?: ActionKey): MetricKey {
  if (action === "SIMPLIFY_FORM") return "formSubmitRate";
  if (action === "ADD_FAQ") return "diagnosisStartRate";
  return "diagnosisStartRate";
}

function faqDraft(topic?: string) {
  if (topic === "料金・費用") return { question: "料金について教えてください", answer: "料金プランや体験レッスンの費用については、スクールへお気軽にお問い合わせください。ご希望に合うプランをご案内します。" };
  if (topic === "体験・予約") return { question: "体験レッスンは予約できますか？", answer: "体験レッスンをご希望の方は、予約フォームからご希望の日時をお送りください。スタッフが確認してご案内します。" };
  return { question: `${topic ?? "よくある質問"}について教えてください`, answer: "詳しい内容は、スクールへお気軽にお問い合わせください。ご希望に合わせてご案内します。" };
}

export default function AiInsightsClient({ initialInsight = null }: { initialInsight?: Insight | null }) {
  const { data: session, status } = useSession();
  const schoolId = (session?.user as { schoolId?: string } | undefined)?.schoolId;
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Insight | null>(initialInsight);
  const [history, setHistory] = useState<Improvement[]>(initialInsight?.improvements ?? []);
  const [loading, setLoading] = useState(!initialInsight);
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [applying, setApplying] = useState(false);
  const [scoreDetailOpen, setScoreDetailOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [faq, setFaq] = useState(faqDraft());

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const encodedSchool = encodeURIComponent(schoolId);
      const insightsRes = await fetch(`/api/admin/ai-insights?schoolId=${encodedSchool}&days=${days}`);
      if (!insightsRes.ok) throw new Error();
      const insights = await insightsRes.json() as Insight;
      setData(insights);
      setHistory(Array.isArray(insights.improvements) ? insights.improvements : []);
    } catch {
      setData(null);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [days, schoolId]);

  useEffect(() => {
    // 初回はサーバーから渡された分析結果を使う。
    if (initialInsight && days === 30) return;
    void load();
  }, [days, initialInsight, load]);

  const funnelMax = useMemo(() => Math.max(1, ...(data?.funnel.map((item) => item.count) ?? [1])), [data]);
  const scoreBreakdown = useMemo(() => {
    if (!data) return [];
    const targets: { key: MetricKey; target: number; note: string }[] = [
      { key: "diagnosisStartRate", target: 50, note: "設置ページから診断を始めた割合" },
      { key: "diagnosisCompletionRate", target: 60, note: "診断を最後まで完了した割合" },
      { key: "formSubmitRate", target: 30, note: "フォーム到達後に送信した割合" },
      { key: "overallConversionRate", target: 5, note: "診断開始から体験予約へ至った割合" },
    ];
    return targets.map(({ key, target, note }) => {
      const value = data.rates[key];
      return { key, target, note, value, score: value == null ? 0 : Math.min(25, Math.round((value / target) * 25)) };
    });
  }, [data]);
  const improvementScore = useMemo(() => scoreBreakdown.reduce((sum, item) => sum + item.score, 0), [scoreBreakdown]);

  const openApply = (suggestion: Suggestion) => {
    if (!suggestion.action) return;
    if (suggestion.action === "ADD_FAQ") setFaq(faqDraft(suggestion.payload?.topic));
    setMessage("");
    setSelected(suggestion);
  };

  const apply = async () => {
    if (!schoolId || !selected?.action || !data) return;
    setApplying(true);
    setMessage("");
    const metricKey = metricFor(selected.action);
    try {
      const res = await fetch("/api/admin/ai-improvements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          actionKey: selected.action,
          payload: selected.action === "ADD_FAQ" ? faq : selected.payload,
          metricKey,
          baselineValue: data.rates[metricKey],
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "反映に失敗しました。");
      setHistory((current) => [result.improvement, ...current].slice(0, 8));
      setSelected(null);
      setMessage("AI提案を適用しました。効果測定を開始します。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "反映に失敗しました。");
    } finally {
      setApplying(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="mx-auto max-w-[1540px] px-4 py-6 text-slate-800 md:px-6">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><Sparkles className="h-6 w-6 text-[#fe6147]" />AIコンサル・分析</h1>
          <p className="mt-1 text-sm text-slate-500">分析から改善の反映、効果測定まで。毎月サイトを育て続けます。</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          読み込み中…
        </div>
      </div>
    );
  }
  if (!data) return <div className="m-6 rounded-xl border border-slate-200 bg-white p-8 text-slate-500">分析データを取得できませんでした。</div>;

  const metrics = [
    ["設置サイトUU", data.funnel[0]?.count.toLocaleString() ?? "0", "訪問状況", "bg-blue-50 text-blue-700"],
    ["診断開始率", rate(data.rates.diagnosisStartRate), "診断への流入", "bg-sky-50 text-sky-700"],
    ["診断完了率", rate(data.rates.diagnosisCompletionRate), "診断体験", "bg-orange-50 text-[#c53f2b]"],
    ["体験予約率", rate(data.rates.overallConversionRate), "総合CV", "bg-emerald-50 text-emerald-700"],
  ] as const;

  return <div className="mx-auto max-w-[1540px] px-4 py-6 text-slate-800 md:px-6">
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><Sparkles className="h-6 w-6 text-[#fe6147]" />AIコンサル・分析</h1><p className="mt-1 text-sm text-slate-500">分析から改善の反映、効果測定まで。毎月サイトを育て続けます。</p></div>
      <div className="flex flex-wrap gap-2"><select className="input h-10" value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={30}>直近30日</option><option value={60}>直近60日</option><option value={90}>直近90日</option></select><button className="btn-ghost inline-flex items-center gap-2" onClick={load}><RefreshCw className="h-4 w-4" />更新</button></div>
    </div>

    {message && <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{message}</span><button aria-label="お知らせを閉じる" onClick={() => setMessage("")}><X className="h-4 w-4" /></button></div>}

    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {metrics.map(([label, value, caption, tone]) => <article key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><p className="text-sm font-medium text-slate-600">{label}</p><span className={`grid h-8 w-8 place-items-center rounded-lg ${tone}`}><TrendingUp className="h-4 w-4" /></span></div><p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p><p className="mt-2 text-xs text-slate-400">{caption}</p></article>)}
      <article className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-4 shadow-sm"><p className="text-sm font-semibold text-[#c53f2b]">AI改善スコア</p><div className="mt-2 flex items-end gap-2"><strong className="text-4xl text-[#fe6147]">{improvementScore}</strong><span className="mb-1 text-sm text-slate-500">/ 100</span></div><p className="mt-2 text-xs text-slate-500">提案を適用して、効果を積み上げましょう。</p><button type="button" onClick={() => setScoreDetailOpen(true)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#fe6147] to-[#f04b34] px-3 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2"><Sparkles className="h-4 w-4" />スコアの詳細を見る <ChevronRight className="h-4 w-4" /></button></article>
    </section>

    <div className="mt-4 grid gap-4 xl:grid-cols-[1.22fr_1fr]">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-bold">体験予約までの流れ</h2><p className="mt-1 text-xs text-slate-500">相性診断からフォーム送信までの離脱状況を確認します。</p></div><ClipboardCheck className="h-5 w-5 text-blue-600" /></div><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">{data.funnel.map((item, index) => <div key={item.label} className="relative rounded-lg bg-slate-50 p-3 last:after:hidden sm:after:absolute sm:after:-right-2 sm:after:top-1/2 sm:after:z-10 sm:after:h-3 sm:after:w-3 sm:after:-translate-y-1/2 sm:after:rotate-45 sm:after:border-r sm:after:border-t sm:after:border-slate-200 sm:after:bg-white"><p className="text-[11px] font-medium text-slate-500">{item.label}</p><strong className="mt-1 block text-xl text-slate-800">{item.count.toLocaleString()}</strong>{index > 0 && <span className="mt-1 block text-[10px] text-slate-400">前段比 {data.funnel[index - 1].count ? Math.round(item.count / data.funnel[index - 1].count * 100) : 0}%</span>}</div>)}</div><div className="mt-5 space-y-2">{data.funnel.map((item) => <div key={item.label} className="grid grid-cols-[90px_1fr_38px] items-center gap-3 text-xs"><span className="text-slate-500">{item.label}</span><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-[#fe6147]" style={{ width: `${item.count === 0 ? 0 : Math.max(3, item.count / funnelMax * 100)}%` }} /></div><strong className="text-right text-slate-700">{item.count}</strong></div>)}</div></section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-bold">離脱ポイント TOP5</h2><p className="mt-1 text-xs text-slate-500">優先して改善する箇所をAIが特定します。</p></div><BrainCircuit className="h-5 w-5 text-[#fe6147]" /></div><div className="mt-4 divide-y divide-slate-100">{data.dropoffs.map((item, index) => <div key={item.label} className="grid grid-cols-[28px_minmax(100px,1fr)_minmax(90px,1fr)_48px] items-center gap-2 py-3 text-xs"><span className="grid h-5 w-5 place-items-center rounded-full bg-rose-50 font-bold text-rose-500">{index + 1}</span><span className="font-medium text-slate-700">{item.label}</span><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-rose-400" style={{ width: `${Math.min(100, item.dropoffRate ?? 0)}%` }} /></div><strong className="text-right text-rose-600">{rate(item.dropoffRate)}</strong></div>)}</div></section>
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-[.9fr_1.25fr_.85fr]">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-bold">需要トレンド</h2><p className="mt-1 text-xs text-slate-500">今伸びている希望を施策へ反映</p></div><Users className="h-5 w-5 text-blue-600" /></div><ol className="mt-4 space-y-3">{data.demand.slice(0, 5).map((item, index) => <li key={item.slug} className="grid grid-cols-[24px_1fr_auto] items-center gap-2 text-xs"><span className="grid h-5 w-5 place-items-center rounded-full bg-blue-50 font-bold text-blue-600">{index + 1}</span><span className="truncate font-medium text-slate-700">{item.label}</span><span className={item.change != null && item.change < 0 ? "text-slate-400" : "font-semibold text-emerald-600"}>{item.count}人 {item.change != null && `${item.change > 0 ? "+" : ""}${item.change}%`}</span></li>)}</ol></section>
      <section className="rounded-xl border border-orange-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="flex items-center gap-2 font-bold"><WandSparkles className="h-5 w-5 text-[#fe6147]" />AI改善提案</h2><p className="mt-1 text-xs text-slate-500">提案内容を確認して、そのままサイト設定へ反映できます。</p></div><span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-[#c53f2b]">{data.suggestions.filter((item) => item.action).length}件を適用可能</span></div><div className="mt-4 space-y-3">{data.suggestions.slice(0, 3).map((item) => <article key={item.title} className="rounded-lg border border-slate-200 p-3"><div className="flex gap-3"><span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.priority === "high" ? "bg-rose-500" : item.priority === "medium" ? "bg-amber-400" : "bg-emerald-500"}`} /><div className="min-w-0 flex-1"><h3 className="text-sm font-bold text-slate-800">{item.title}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</p><div className="mt-3 flex flex-wrap items-center gap-2">{item.action ? <><button onClick={() => openApply(item)} className="inline-flex items-center gap-1.5 rounded-md bg-[#fe6147] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#eb4f35]"><Sparkles className="h-3.5 w-3.5" />AIで適用</button><button type="button" onClick={() => openApply(item)} className="inline-flex items-center gap-1 rounded-md px-1 py-2 text-[11px] font-semibold text-slate-500 transition hover:text-[#c53f2b] focus:outline-none focus:underline"><span>変更内容を確認</span><ChevronRight className="h-3.5 w-3.5" /></button></> : <Link href={item.href} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">設定を確認 <ChevronRight className="h-3.5 w-3.5" /></Link>}</div></div></div></article>)}</div></section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-bold">改善履歴・効果測定</h2><p className="mt-1 text-xs text-slate-500">適用後7日から効果を追跡</p></div><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div><div className="mt-4 space-y-3">{history.length ? history.slice(0, 4).map((item) => { const current = item.metricKey ? data.rates[item.metricKey] : null; const measurable = Date.now() - new Date(item.appliedAt).getTime() >= 7 * 86_400_000 && current != null && item.baselineValue != null; const delta = measurable ? Math.round((current - item.baselineValue) * 10) / 10 : null; return <article key={item.id} className="border-b border-slate-100 pb-3 last:border-0"><div className="flex items-start justify-between gap-2"><p className="text-xs font-bold text-slate-700">{item.title}</p><span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">適用済み</span></div><p className="mt-1 text-[11px] leading-4 text-slate-500">{item.summary}</p><div className="mt-2 flex items-center justify-between text-[11px]"><span className="text-slate-400">{new Date(item.appliedAt).toLocaleDateString("ja-JP")}</span>{delta == null ? <span className="text-blue-600">効果測定中</span> : <span className={delta >= 0 ? "font-bold text-emerald-600" : "font-bold text-rose-500"}>{metricLabels[item.metricKey!]} {delta >= 0 ? "+" : ""}{delta}pt</span>}</div></article>; }) : <div className="rounded-lg bg-slate-50 p-4 text-center text-xs leading-5 text-slate-500">AI提案を適用すると、ここに改善履歴と効果測定が表示されます。</div>}</div></section>
    </div>

    {scoreDetailOpen && (
      <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="score-detail-title">
        <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div><p className="flex items-center gap-2 text-sm font-semibold text-[#fe6147]"><Sparkles className="h-4 w-4" />AI改善スコア</p><h2 id="score-detail-title" className="mt-1 text-xl font-bold text-slate-900">{improvementScore} / 100 の内訳</h2><p className="mt-1 text-sm text-slate-500">直近{data.days}日の指標を、目標値に対して4項目・各25点で評価しています。</p></div>
            <button aria-label="閉じる" onClick={() => setScoreDetailOpen(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
          <div className="mt-5 space-y-3">{scoreBreakdown.map((item) => <article key={item.key} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-bold text-slate-800">{metricLabels[item.key]}</h3><p className="mt-1 text-xs text-slate-500">{item.note}</p></div><strong className="text-lg text-[#fe6147]">{item.score}<span className="text-xs font-medium text-slate-400"> / 25点</span></strong></div><div className="mt-3 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-[#fe6147]" style={{ width: `${item.value == null ? 0 : Math.min(100, item.value / item.target * 100)}%` }} /></div><span className="w-28 text-right text-xs font-semibold text-slate-700">{rate(item.value)} <span className="font-normal text-slate-400">/ 目標{item.target}%</span></span></div></article>)}</div>
          <section className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4"><div><p className="text-sm font-bold text-[#9a3525]">次に優先する改善</p><p className="mt-1 text-xs text-[#9a3525]/80">スコアを上げるために、効果が大きい順に取り組みましょう。</p></div><div className="mt-3 space-y-2">{data.suggestions.slice(0, 2).map((suggestion, index) => <article key={suggestion.title} className="flex items-center gap-3 rounded-lg border border-orange-100 bg-white p-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-orange-100 text-xs font-bold text-[#c53f2b]">{index + 1}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800">{suggestion.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{suggestion.detail}</p></div>{suggestion.action ? <button onClick={() => { setScoreDetailOpen(false); openApply(suggestion); }} className="shrink-0 rounded-md bg-[#fe6147] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#eb4f35]">この改善を適用</button> : <Link href={suggestion.href} className="shrink-0 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-700">確認する</Link>}</article>)}</div></section>
          <div className="mt-6 flex justify-end"><button className="btn-ghost" onClick={() => setScoreDetailOpen(false)}>閉じる</button></div>
        </div>
      </div>
    )}

    {selected?.action && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="apply-title"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-sm font-semibold text-[#fe6147]"><Sparkles className="h-4 w-4" />AI改善を適用</p><h2 id="apply-title" className="mt-1 text-lg font-bold text-slate-900">{selected.title}</h2></div><button aria-label="閉じる" onClick={() => setSelected(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><p className="mt-3 text-sm leading-6 text-slate-600">{selected.detail}</p><div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs leading-5 text-[#9a3525]"><Lightbulb className="mr-1 inline h-4 w-4" />適用内容は履歴に保存され、適用時点の{metricLabels[metricFor(selected.action)]}と比較して効果を追跡します。</div>{selected.action === "ADD_FAQ" && <div className="mt-4 space-y-3"><label className="block text-xs font-semibold text-slate-700">質問<input className="input mt-1 w-full" value={faq.question} onChange={(event) => setFaq((current) => ({ ...current, question: event.target.value }))} /></label><label className="block text-xs font-semibold text-slate-700">回答<textarea className="input mt-1 min-h-24 w-full" value={faq.answer} onChange={(event) => setFaq((current) => ({ ...current, answer: event.target.value }))} /></label></div>}<div className="mt-6 flex justify-end gap-2"><button className="btn-ghost" onClick={() => setSelected(null)} disabled={applying}>キャンセル</button><button className="btn-primary inline-flex items-center gap-2" onClick={apply} disabled={applying}>{applying ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}この内容で適用</button></div></div></div>}
  </div>;
}
