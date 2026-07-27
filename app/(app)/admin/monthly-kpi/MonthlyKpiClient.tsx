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
  const cumulativeValues = values.reduce<number[]>((total, value) => [...total, (total.at(-1) ?? 0) + value], []);
  const showCumulative = metric === "firstMonthRevenue";
  const primaryStep = metric === "firstMonthRevenue" ? 10_000 : metric === "applications" ? 5 : 10;
  const max = Math.max(primaryStep, Math.ceil(Math.max(...values) / primaryStep) * primaryStep);
  const cumulativeMax = Math.max(50_000, Math.ceil(Math.max(1, ...cumulativeValues) / 50_000) * 50_000);
  const plot = { left: 112, right: 452, top: 44, bottom: 166 };
  const plotHeight = plot.bottom - plot.top;
  const xFor = (index: number) => plot.left + index * ((plot.right - plot.left) / Math.max(1, values.length - 1));
  const yFor = (value: number, axisMax: number) => plot.bottom - value / axisMax * plotHeight;
  const points = values.map((value, index) => `${xFor(index)},${yFor(value, max)}`).join(" ");
  const cumulativePoints = cumulativeValues.map((value, index) => `${xFor(index)},${yFor(value, cumulativeMax)}`).join(" ");
  const area = `${plot.left},${plot.bottom} ${points} ${plot.right},${plot.bottom}`;
  const display = (value: number) => metric === "firstMonthRevenue" ? formatYen(value) : metric === "applications" ? `${value}件` : `${value}%`;
  const primaryTicks = Array.from({ length: Math.round(max / primaryStep) + 1 }, (_, index) => max - index * primaryStep);
  const cumulativeTicks = Array.from({ length: Math.round(cumulativeMax / 50_000) + 1 }, (_, index) => cumulativeMax - index * 50_000);
  const axisLabel = (value: number) => metric === "firstMonthRevenue" ? `¥${value / 10_000}万` : metric === "applications" ? `${value}件` : `${value}%`;
  return <div className="relative mt-5 overflow-x-auto rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-3 pb-1 pt-3"><div className="mb-2 flex justify-end gap-2 text-[11px] font-medium"><span className="flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[#e84f36]"><i className="h-0.5 w-4 bg-[#fe6147]" />{showCumulative ? "月次 推定売上" : labelFor[metric]}</span>{showCumulative && <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-blue-700"><i className="w-4 border-t-2 border-dashed border-blue-600" />累計 推定売上</span>}</div><svg viewBox="0 0 520 210" className="min-w-[680px] w-full" role="img" aria-label={`${labelFor[metric]}の月次推移`}>
    <defs><linearGradient id="revenue-area" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#fe6147" stopOpacity=".24" /><stop offset="1" stopColor="#fe6147" stopOpacity=".015" /></linearGradient><filter id="point-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#0f172a" floodOpacity=".14" /></filter></defs>
    {primaryTicks.map((value) => <g key={value}><line x1={plot.left} x2={plot.right} y1={yFor(value, max)} y2={yFor(value, max)} stroke="#dbe5f1" strokeWidth="1" /><text x="104" y={yFor(value, max) + 3} textAnchor="end" fontSize="8" fontWeight="500" fill={showCumulative ? "#e84f36" : "#64748b"}>{axisLabel(value)}</text></g>)}
    {showCumulative && <><text x="16" y="26" fontSize="7" fontWeight="600" fill="#2563eb">累計</text>{cumulativeTicks.map((value) => <text key={value} x="48" y={yFor(value, cumulativeMax) + 3} textAnchor="end" fontSize="8" fontWeight="500" fill="#2563eb">{`¥${value / 10_000}万`}</text>)}</>}
    <path d={`M ${area.replaceAll(" ", " L ")} Z`} fill="url(#revenue-area)" /><polyline points={points} fill="none" stroke="#fe6147" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    {showCumulative && <polyline points={cumulativePoints} fill="none" stroke="#2563eb" strokeWidth="2.2" strokeDasharray="5 5" strokeLinejoin="round" strokeLinecap="round" />}
    {values.map((value, index) => { const x = xFor(index); const y = yFor(value, max); const cumulativeY = yFor(cumulativeValues[index], cumulativeMax); const cumulativeLabelY = cumulativeY > y - 18 ? cumulativeY + 15 : cumulativeY - 9; return <g key={months[index].key}><circle cx={x} cy={y} r="4.5" fill="#fe6147" stroke="white" strokeWidth="2.2" filter="url(#point-shadow)" /><text x={x} y={y - 10} textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#334155">{display(value)}</text>{showCumulative && <><circle cx={x} cy={cumulativeY} r="3.6" fill="white" stroke="#2563eb" strokeWidth="1.7" filter="url(#point-shadow)" />{index > 0 && <text x={x + 7} y={cumulativeLabelY} fontSize="7.5" fontWeight="600" fill="#2563eb">{formatYen(cumulativeValues[index])}</text>}</>}<text x={x} y="190" textAnchor="middle" fontSize="9" fontWeight="500" fill="#64748b">{months[index].label}</text></g>; })}
  </svg></div>;
}

export default function MonthlyKpiClient({ initialData = null, initialSchoolId }: { initialData?: MonthlyKpiData | null; initialSchoolId: string }) {
  const { data: session } = useSession();
  const schoolId = String((session?.user as { schoolId?: string } | undefined)?.schoolId ?? initialSchoolId);
  const [data, setData] = useState(initialData);
  const [settings, setSettings] = useState<Settings>(initialData?.settings ?? { expectedEnrollmentRate: 50, enrollmentFee: 0, monthlyFee: 0, otherFees: 0, averageRetentionMonths: 6 });
  const [metric, setMetric] = useState<Metric>("applications");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const latest = data?.months.at(-1);
  const applicationCount = latest?.applications ?? 0;
  const enrolled = applicationCount * settings.expectedEnrollmentRate / 100;
  const initialRevenue = Math.round(enrolled * (settings.enrollmentFee + settings.monthlyFee + settings.otherFees));
  const ltvRevenue = Math.round(enrolled * (settings.enrollmentFee + settings.otherFees + settings.monthlyFee * settings.averageRetentionMonths));
  const cumulativeRevenue = data?.months.reduce((total, month) => total + month.firstMonthRevenue, 0) ?? 0;
  const impact = useMemo(() => Math.round(initialRevenue * 0.1), [initialRevenue]);

  const updateSetting = (key: keyof Settings, value: string) => setSettings((current) => ({ ...current, [key]: Number(value) || 0 }));
  const load = useCallback(async () => {
    if (!schoolId) return;
    try {
      const response = await fetch(`/api/admin/monthly-kpi?schoolId=${encodeURIComponent(schoolId)}&months=6`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "月次KPIの取得に失敗しました");
      setSettings(result.settings); setData(result);
      sessionStorage.setItem(`rizbo:monthly-kpi:${schoolId}`, JSON.stringify(result));
    } catch (error) { setMessage(error instanceof Error ? error.message : "月次KPIの取得に失敗しました"); }
  }, [schoolId]);
  useEffect(() => {
    if (initialData || !schoolId) return;
    try {
      const cached = sessionStorage.getItem(`rizbo:monthly-kpi:${schoolId}`);
      if (cached) {
        const value = JSON.parse(cached) as MonthlyKpiData;
        setSettings(value.settings); setData(value);
      }
    } catch { sessionStorage.removeItem(`rizbo:monthly-kpi:${schoolId}`); }
    void load();
  }, [initialData, load, schoolId]);
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
      setSettings(refreshedData.settings); setData(refreshedData); sessionStorage.setItem(`rizbo:monthly-kpi:${schoolId}`, JSON.stringify(refreshedData)); setMessage("計算条件を保存し、グラフを更新しました。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存に失敗しました"); } finally { setSaving(false); }
  };

  if (!data) return <main className="mx-auto max-w-[1540px] px-4 py-6 text-slate-800 md:px-6"><header className="mb-6"><h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><TrendingUp className="h-6 w-6 text-[#fe6147]" />月次KPI・売上シミュレーション</h1><p className="mt-1 text-sm text-slate-500">体験予約から売上までの推移を可視化し、リズボ経由の成果を振り返れます。</p></header><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm"><LoaderCircle className="h-4 w-4 animate-spin" />読み込み中...</div></main>;
  const fields: { key: keyof Settings; label: string; suffix: string; min?: number; max?: number }[] = [
    { key: "expectedEnrollmentRate", label: "想定入会率", suffix: "%", max: 100 }, { key: "enrollmentFee", label: "入会金", suffix: "円" }, { key: "monthlyFee", label: "月謝", suffix: "円" }, { key: "otherFees", label: "その他費用", suffix: "円" }, { key: "averageRetentionMonths", label: "平均継続月数", suffix: "か月", min: 1, max: 120 },
  ];
  return <main className="mx-auto max-w-[1540px] px-4 py-6 text-slate-800 md:px-6">
    <header className="mb-6"><h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><TrendingUp className="h-6 w-6 text-[#fe6147]" />月次KPI・売上シミュレーション</h1><p className="mt-1 text-sm text-slate-500">体験予約から売上までの推移を可視化し、リズボ経由の成果を振り返れます。</p></header>
    <section className="grid gap-4 lg:grid-cols-3"><article className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-6 shadow-sm"><div className="flex items-start justify-between"><div><p className="font-bold text-[#d94731]">リズボ経由の推定初月売上 <Info className="ml-1 inline h-4 w-4" /></p><strong className="mt-4 block text-4xl tracking-tight text-[#fe4e32]">{formatYen(initialRevenue)}</strong><p className="mt-3 text-sm text-slate-600">申込 {applicationCount}件 × 想定入会率 {settings.expectedEnrollmentRate}% × 初月単価</p></div><span className="grid h-14 w-14 place-items-center rounded-full bg-orange-100 text-[#fe6147]"><TrendingUp className="h-7 w-7" /></span></div></article><article className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm"><div className="flex items-start justify-between"><div><p className="font-bold text-emerald-700">推定LTV売上 <Info className="ml-1 inline h-4 w-4" /></p><strong className="mt-4 block text-4xl tracking-tight text-emerald-700">{formatYen(ltvRevenue)}</strong><p className="mt-3 text-sm text-slate-600">申込 {applicationCount}件 × 想定入会率 {settings.expectedEnrollmentRate}% × 平均継続 {settings.averageRetentionMonths}か月</p></div><span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Crown className="h-7 w-7" /></span></div></article><article className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm"><div className="flex items-start justify-between"><div><p className="font-bold text-blue-700">表示期間の累計推定売上 <Info className="ml-1 inline h-4 w-4" /></p><strong className="mt-4 block text-4xl tracking-tight text-blue-800">{formatYen(cumulativeRevenue)}</strong><p className="mt-3 text-sm text-slate-600">グラフ表示期間内の月次推定売上の累計</p></div><span className="grid h-14 w-14 place-items-center rounded-full bg-blue-100 text-blue-600"><BarChart3 className="h-7 w-7" /></span></div></article></section>
    <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-bold"><BarChart3 className="h-5 w-5 text-[#fe6147]" />主要KPIの月次推移</h2><p className="mt-1 text-xs text-slate-500">直近6か月の実測値です。推定売上は入力した計算条件で再計算されます。</p></div><span className="text-xs text-slate-400">{metric === "firstMonthRevenue" ? "単位：円" : metric === "applications" ? "単位：件" : "単位：%"}</span></div><div className="mt-5 flex flex-wrap gap-1 rounded-lg bg-slate-50 p-1">{(Object.keys(labelFor) as Metric[]).map((key) => <button key={key} type="button" onClick={() => setMetric(key)} className={`rounded-md px-3 py-2 text-xs font-semibold transition ${metric === key ? "bg-orange-100 text-[#d94731] shadow-sm" : "text-slate-500 hover:bg-white"}`}>{labelFor[key]}</button>)}</div><RevenueChart months={data.months} metric={metric} /><p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">推定売上 = 申込数 × 想定入会率 ×（入会金 + 月謝 + その他費用）</p></article>
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">計算条件 <span className="text-xs font-normal text-slate-400">（スクールごとに保存）</span></h2><p className="mt-1 text-xs text-slate-500">実際の単価・継続月数を入力してください。</p><div className="mt-5 space-y-3">{fields.map((field) => <label key={field.key} className="grid grid-cols-[1fr_148px] items-center gap-3 text-sm font-semibold text-slate-700"><span>{field.label}</span><span className="relative"><input type="number" min={field.min ?? 0} max={field.max} value={settings[field.key]} onChange={(event) => updateSetting(field.key, event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-10 text-right text-sm font-semibold text-slate-900 shadow-sm outline-none [color-scheme:light] [-webkit-text-fill-color:#0f172a] caret-[#fe6147] transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100" /><small className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">{field.suffix}</small></span></label>)}</div><p className="mt-4 text-[11px] leading-5 text-slate-500">LTVは、入会金 + その他費用 + 月謝 × 平均継続月数で算出します。</p><button type="button" onClick={save} disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#fe6147] to-[#f04b34] px-4 py-3 text-sm font-bold text-white shadow-md shadow-orange-200 transition hover:-translate-y-0.5 disabled:opacity-60"><Save className="h-4 w-4" />{saving ? "保存・再計算中..." : "保存して再計算"}</button>{message && <p className={`mt-3 text-xs ${message.includes("失敗") ? "text-rose-600" : "text-emerald-600"}`}>{message}</p>}</aside></section>
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-bold"><Sparkles className="h-5 w-5 text-[#fe6147]" />今月の改善インパクト</h2><p className="mt-1 text-xs text-slate-500">現在の数値をもとに、改善した場合の売上への影響を確認できます。</p></div><span className="rounded-lg bg-orange-50 px-4 py-2 text-sm font-bold text-[#d94731]">指標が10%改善した場合 +{formatYen(impact)}</span></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">今月の申込数</p><strong className="mt-1 block text-2xl">{applicationCount}件</strong></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">想定入会数</p><strong className="mt-1 block text-2xl">{enrolled.toFixed(1)}人</strong></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">初月単価</p><strong className="mt-1 block text-2xl">{formatYen(settings.enrollmentFee + settings.monthlyFee + settings.otherFees)}</strong></div></div></section>
  </main>;
}
