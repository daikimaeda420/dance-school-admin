"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { BarChart3, Crown, Info, LoaderCircle, Save, Sparkles, TrendingUp } from "lucide-react";

type Settings = { expectedEnrollmentRate: number; enrollmentFee: number; monthlyFee: number; otherFees: number; averageRetentionMonths: number };
type Month = { key: string; label: string; applications: number; bookingRate: number; diagnosisStartRate: number; formSubmitRate: number; firstMonthRevenue: number; ltvRevenue: number };
export type MonthlyKpiData = { months: Month[]; settings: Settings };
type Metric = "applications" | "bookingRate" | "diagnosisStartRate" | "formSubmitRate" | "firstMonthRevenue";

const formatYen = (value: number) => new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(value);
const labelFor: Record<Metric, string> = { applications: "体験予約数", bookingRate: "体験予約率", diagnosisStartRate: "診断開始率", formSubmitRate: "フォーム送信率", firstMonthRevenue: "推定売上" };

function RevenueChart({ months, metric }: { months: Month[]; metric: Metric }) {
  const values = months.map((month) => month[metric]);
  const max = Math.max(1, ...values) * 1.18;
  const points = values.map((value, index) => `${52 + index * (296 / Math.max(1, values.length - 1))},${158 - value / max * 112}`).join(" ");
  const area = `52,158 ${points} ${348},158`;
  const display = (value: number) => metric === "firstMonthRevenue" ? formatYen(value) : metric === "applications" ? `${value}件` : `${value}%`;
  return <div className="relative mt-4 overflow-x-auto"><svg viewBox="0 0 400 196" className="min-w-[620px] w-full" role="img" aria-label={`${labelFor[metric]}の月次推移`}>
    <defs><linearGradient id="revenue-area" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#fe6147" stopOpacity=".28" /><stop offset="1" stopColor="#fe6147" stopOpacity=".02" /></linearGradient></defs>
    {[46, 83, 120, 158].map((y) => <line key={y} x1="40" x2="368" y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />)}
    <path d={`M ${area.replaceAll(" ", " L ")} Z`} fill="url(#revenue-area)" /><polyline points={points} fill="none" stroke="#fe6147" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    {values.map((value, index) => { const x = 52 + index * (296 / Math.max(1, values.length - 1)); const y = 158 - value / max * 112; return <g key={months[index].key}><circle cx={x} cy={y} r="4.5" fill="#fe6147" stroke="white" strokeWidth="2" /><text x={x} y={y - 10} textAnchor="middle" fontSize="9" fontWeight="700" fill="#475569">{display(value)}</text><text x={x} y="180" textAnchor="middle" fontSize="10" fill="#64748b">{months[index].label}</text></g>; })}
  </svg></div>;
}

export default function MonthlyKpiClient({ initialData = null, initialSchoolId }: { initialData?: MonthlyKpiData | null; initialSchoolId: string }) {
  const { data: session } = useSession();
  const schoolId = String((session?.user as { schoolId?: string } | undefined)?.schoolId ?? initialSchoolId);
  const [data, setData] = useState(initialData);
  const [settings, setSettings] = useState<Settings>(initialData?.settings ?? { expectedEnrollmentRate: 50, enrollmentFee: 0, monthlyFee: 0, otherFees: 0, averageRetentionMonths: 6 });
  const [metric, setMetric] = useState<Metric>("firstMonthRevenue");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const latest = data?.months.at(-1);
  const applicationCount = latest?.applications ?? 0;
  const enrolled = applicationCount * settings.expectedEnrollmentRate / 100;
  const initialRevenue = Math.round(enrolled * (settings.enrollmentFee + settings.monthlyFee + settings.otherFees));
  const ltvRevenue = Math.round(enrolled * (settings.enrollmentFee + settings.otherFees + settings.monthlyFee * settings.averageRetentionMonths));
  const impact = useMemo(() => Math.round(initialRevenue * 0.1), [initialRevenue]);

  const updateSetting = (key: keyof Settings, value: string) => setSettings((current) => ({ ...current, [key]: Number(value) || 0 }));
  const load = useCallback(async () => {
    if (!schoolId) return;
    try {
      const response = await fetch(`/api/admin/monthly-kpi?schoolId=${encodeURIComponent(schoolId)}&months=6`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "月次KPIの取得に失敗しました");
      setSettings(result.settings); setData(result);
    } catch (error) { setMessage(error instanceof Error ? error.message : "月次KPIの取得に失敗しました"); }
  }, [schoolId]);
  useEffect(() => { if (!initialData) void load(); }, [initialData, load]);
  const save = async () => {
    if (!schoolId) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/admin/monthly-kpi", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schoolId, ...settings }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "保存に失敗しました");
      const refreshed = await fetch(`/api/admin/monthly-kpi?schoolId=${encodeURIComponent(schoolId)}&months=6`, { cache: "no-store" });
      const refreshedData = await refreshed.json();
      if (!refreshed.ok) throw new Error(refreshedData.error ?? "再計算に失敗しました");
      setSettings(refreshedData.settings); setData(refreshedData); setMessage("計算条件を保存し、グラフを更新しました。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存に失敗しました"); } finally { setSaving(false); }
  };

  if (!data) return <main className="mx-auto max-w-[1540px] px-4 py-6 md:px-6"><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm"><LoaderCircle className="h-4 w-4 animate-spin" />読み込み中...</div></main>;
  const fields: { key: keyof Settings; label: string; suffix: string; min?: number; max?: number }[] = [
    { key: "expectedEnrollmentRate", label: "想定入会率", suffix: "%", max: 100 }, { key: "enrollmentFee", label: "入会金", suffix: "円" }, { key: "monthlyFee", label: "月謝", suffix: "円" }, { key: "otherFees", label: "その他費用", suffix: "円" }, { key: "averageRetentionMonths", label: "平均継続月数", suffix: "か月", min: 1, max: 120 },
  ];
  return <main className="mx-auto max-w-[1540px] px-4 py-6 text-slate-800 md:px-6">
    <header className="mb-6"><h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><TrendingUp className="h-6 w-6 text-[#fe6147]" />月次KPI・売上シミュレーション</h1><p className="mt-1 text-sm text-slate-500">体験予約から売上までの推移を可視化し、リズボ経由の成果を振り返れます。</p></header>
    <section className="grid gap-4 lg:grid-cols-2"><article className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-6 shadow-sm"><div className="flex items-start justify-between"><div><p className="font-bold text-[#d94731]">リズボ経由の推定初月売上 <Info className="ml-1 inline h-4 w-4" /></p><strong className="mt-4 block text-4xl tracking-tight text-[#fe4e32]">{formatYen(initialRevenue)}</strong><p className="mt-3 text-sm text-slate-600">申込 {applicationCount}件 × 想定入会率 {settings.expectedEnrollmentRate}% × 初月単価</p></div><span className="grid h-14 w-14 place-items-center rounded-full bg-orange-100 text-[#fe6147]"><TrendingUp className="h-7 w-7" /></span></div></article><article className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm"><div className="flex items-start justify-between"><div><p className="font-bold text-emerald-700">推定LTV売上 <Info className="ml-1 inline h-4 w-4" /></p><strong className="mt-4 block text-4xl tracking-tight text-emerald-700">{formatYen(ltvRevenue)}</strong><p className="mt-3 text-sm text-slate-600">申込 {applicationCount}件 × 想定入会率 {settings.expectedEnrollmentRate}% × 平均継続 {settings.averageRetentionMonths}か月</p></div><span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Crown className="h-7 w-7" /></span></div></article></section>
    <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-bold"><BarChart3 className="h-5 w-5 text-[#fe6147]" />主要KPIの月次推移</h2><p className="mt-1 text-xs text-slate-500">直近6か月の実測値です。推定売上は入力した計算条件で再計算されます。</p></div><span className="text-xs text-slate-400">{metric === "firstMonthRevenue" ? "単位：円" : metric === "applications" ? "単位：件" : "単位：%"}</span></div><div className="mt-5 flex flex-wrap gap-1 rounded-lg bg-slate-50 p-1">{(Object.keys(labelFor) as Metric[]).map((key) => <button key={key} type="button" onClick={() => setMetric(key)} className={`rounded-md px-3 py-2 text-xs font-semibold transition ${metric === key ? "bg-orange-100 text-[#d94731] shadow-sm" : "text-slate-500 hover:bg-white"}`}>{labelFor[key]}</button>)}</div><RevenueChart months={data.months} metric={metric} /><p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">推定売上 = 申込数 × 想定入会率 ×（入会金 + 月謝 + その他費用）</p></article>
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">計算条件 <span className="text-xs font-normal text-slate-400">（スクールごとに保存）</span></h2><p className="mt-1 text-xs text-slate-500">実際の単価・継続月数を入力してください。</p><div className="mt-5 space-y-3">{fields.map((field) => <label key={field.key} className="grid grid-cols-[1fr_148px] items-center gap-3 text-sm font-semibold text-slate-700"><span>{field.label}</span><span className="relative"><input type="number" min={field.min ?? 0} max={field.max} value={settings[field.key]} onChange={(event) => updateSetting(field.key, event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-10 text-right text-sm font-semibold text-slate-900 shadow-sm outline-none [color-scheme:light] [-webkit-text-fill-color:#0f172a] caret-[#fe6147] transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100" /><small className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">{field.suffix}</small></span></label>)}</div><p className="mt-4 text-[11px] leading-5 text-slate-500">LTVは、入会金 + その他費用 + 月謝 × 平均継続月数で算出します。</p><button type="button" onClick={save} disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#fe6147] to-[#f04b34] px-4 py-3 text-sm font-bold text-white shadow-md shadow-orange-200 transition hover:-translate-y-0.5 disabled:opacity-60"><Save className="h-4 w-4" />{saving ? "保存・再計算中..." : "保存して再計算"}</button>{message && <p className={`mt-3 text-xs ${message.includes("失敗") ? "text-rose-600" : "text-emerald-600"}`}>{message}</p>}</aside></section>
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-bold"><Sparkles className="h-5 w-5 text-[#fe6147]" />今月の改善インパクト</h2><p className="mt-1 text-xs text-slate-500">現在の数値をもとに、改善した場合の売上への影響を確認できます。</p></div><span className="rounded-lg bg-orange-50 px-4 py-2 text-sm font-bold text-[#d94731]">指標が10%改善した場合 +{formatYen(impact)}</span></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">今月の申込数</p><strong className="mt-1 block text-2xl">{applicationCount}件</strong></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">想定入会数</p><strong className="mt-1 block text-2xl">{enrolled.toFixed(1)}人</strong></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">初月単価</p><strong className="mt-1 block text-2xl">{formatYen(settings.enrollmentFee + settings.monthlyFee + settings.otherFees)}</strong></div></div></section>
  </main>;
}
