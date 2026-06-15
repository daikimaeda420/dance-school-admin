// app/(app)/page.tsx — Home (未ログインLP + ログイン後 統合ダッシュボード)
"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Home,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileDown,
  RefreshCw,
  Copy,
  MessageSquare,
  BarChart3,
  MousePointerClick,
  Settings,
  Mail,
  ChevronRight,
  Users,
  TrendingDown,
  Activity,
  ChevronDown,
  ChevronUp,
  Phone,
} from "lucide-react";

type UserWithSchool = {
  name?: string;
  email?: string;
  image?: string;
  schoolId?: string;
};

type KPI = { label: string; value: string; delta?: string; note?: string };
type Activity = { time: string; text: string };
type SetupItem = { label: string; done: boolean; href: string };
type SystemInfo = { version: string; env: string; lastBackup: string };
type ConversionUser = {
  id: string;
  name: string;
  email: string;
  tel: string;
  time: string;
};
type ReadinessStatus = "ok" | "warn" | "missing";
type ReadinessSummary = {
  status: ReadinessStatus;
  statusLabel: string;
  completionPercent: number;
  okCount: number;
  warnCount: number;
  blockingCount: number;
  totalCount: number;
  activeDataLabel: string;
  href: string;
};
type DiagnosisReadinessSummary = ReadinessSummary;
type FaqReadinessSummary = ReadinessSummary;

type DropoffStep = {
  stepKey: string;
  label: string;
  count: number;
  prevCount: number;
  retentionRate: number | null;
  dropoffRate: number | null;
};

type IconClickStat = {
  stepKey: string;
  label: string;
  totalClicks: number;
  uniqueSessions: number;
};

type FormFieldStep = {
  stepKey: string;
  label: string;
  reachedCount: number;
  abandonCount: number;
  reachedRate: number | null;
};

type DashboardResponse = {
  qaKpis: KPI[];
  activities: Activity[];
  diagnosisKpis: KPI[];
  recentConversions: ConversionUser[];
  hasSessionLogs: boolean;
  setup: SetupItem[];
  system: SystemInfo | null;
  kpis: KPI[];
};

type DropoffResponse = {
  totalSessions: number;
  days: number;
  steps: DropoffStep[];
  allSteps: DropoffStep[];
  iconClickStats?: IconClickStat[];
  formOpenCount?: number;
  formFieldSteps?: FormFieldStep[];
};

const RANGES = [
  { key: 7, label: "直近7日" },
  { key: 14, label: "直近14日" },
  { key: 30, label: "直近30日" },
];

const READINESS_TONES: Record<
  ReadinessStatus,
  {
    iconClass: string;
    badgeClass: string;
    progressClass: string;
  }
> = {
  ok: {
    iconClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/25 dark:text-emerald-300",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-700",
    progressClass: "bg-emerald-500",
  },
  warn: {
    iconClass: "bg-amber-50 text-amber-600 dark:bg-amber-900/25 dark:text-amber-300",
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-100 dark:border-amber-700",
    progressClass: "bg-amber-500",
  },
  missing: {
    iconClass: "bg-red-50 text-red-600 dark:bg-red-900/25 dark:text-red-300",
    badgeClass:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-700",
    progressClass: "bg-red-500",
  },
};

const LOGIN_HREF = "/login";

const LP_NAV = [
  { href: "#features", label: "機能" },
  { href: "#workflow", label: "導入の流れ" },
  { href: "#reports", label: "運用レポート" },
  { href: "#cta", label: "始める" },
];

const LP_PROOF = [
  "24時間自動応答で問い合わせ対応を削減",
  "診断で最適なクラスへ案内",
  "フォーム送信とメール通知を自動化",
];

const LP_HERO_METRICS = [
  { value: "24h", label: "問い合わせ自動応答" },
  { value: "1導線", label: "診断から予約まで統合" },
  { value: "30日", label: "ログを見て改善" },
];

const LP_PROBLEMS = [
  {
    title: "同じ質問への対応に時間が取られる",
    text: "営業時間外の問い合わせや体験前の不安に、スタッフが個別対応している。",
  },
  {
    title: "どのクラスが合うか分からず離脱する",
    text: "初心者・経験者・年齢・目的ごとの案内が難しく、予約前の迷いが残る。",
  },
  {
    title: "フォーム後の対応が属人化する",
    text: "申込内容の確認、通知、返信、日程調整が手作業になりやすい。",
  },
  {
    title: "改善すべきポイントが見えない",
    text: "どこで迷われたか、どの質問が多いか、予約につながったかを追えない。",
  },
];

const LP_FEATURES = [
  {
    title: "AIチャットボット",
    text: "料金、アクセス、持ち物、体験の流れなどをサイト上で即時回答。よくある質問は管理画面から更新できます。",
    icon: MessageSquare,
    color: "text-[#fe6147] bg-[#fff0ec]",
  },
  {
    title: "パーソナル診断",
    text: "年齢、目的、経験、ジャンルの好みから、来校前のユーザーに合うクラスや講師を提案します。",
    icon: MousePointerClick,
    color: "text-emerald-700 bg-emerald-50",
  },
  {
    title: "フォーム自動化",
    text: "体験予約フォーム、管理者通知、自動返信メールを連携。申込後の対応漏れを防ぎます。",
    icon: Mail,
    color: "text-blue-700 bg-blue-50",
  },
  {
    title: "運用レポート",
    text: "Q&Aログ、診断ファネル、フォーム到達率、申込数を確認し、改善の優先順位を判断できます。",
    icon: BarChart3,
    color: "text-slate-800 bg-slate-100",
  },
];

const LP_WORKFLOW = [
  {
    title: "埋め込み",
    text: "発行されたスクリプトを既存サイトへ追加します。",
    icon: Copy,
  },
  {
    title: "設定・公開",
    text: "FAQ、診断、フォーム、通知メールを管理画面で整えます。",
    icon: Settings,
  },
  {
    title: "自動対応",
    text: "サイト訪問者の疑問や迷いを、その場で予約導線へつなげます。",
    icon: Activity,
  },
  {
    title: "分析・改善",
    text: "ログとファネルから、次に直すべき箇所を把握します。",
    icon: TrendingDown,
  },
];

const LP_REPORT_CARDS = [
  ["Q&Aログ", "よく見られる質問と未回答を確認"],
  ["診断ファネル", "離脱ステップとフォーム到達を把握"],
  ["申込状況", "体験予約の成果を追跡"],
];

const LP_REPORT_METRICS = [
  { label: "Q&Aセッション", value: "142", note: "質問傾向を集計" },
  { label: "フォーム到達率", value: "38%", note: "結果画面からの移動" },
  { label: "申込数", value: "16", note: "直近30日" },
];

const LP_FUNNEL_STEPS = [
  { label: "診断開始", rate: 100 },
  { label: "結果表示", rate: 78 },
  { label: "フォーム到達", rate: 38 },
  { label: "申込完了", rate: 16 },
];

const LP_REPORT_INSIGHTS = [
  {
    title: "未回答FAQを追加",
    text: "料金・振替・体験時の持ち物に関する質問が増えています。",
  },
  {
    title: "結果画面のCTAを見直し",
    text: "フォーム到達前の離脱が大きいステップを優先的に改善します。",
  },
];

// ── サブコンポーネント ──────────────────────────────────────

function KpiCard({ kpi, icon }: { kpi: KPI; icon?: React.ReactNode }) {
  return (
    <div className="card p-5 flex flex-col gap-1">
      {icon && (
        <div className="text-gray-400 dark:text-gray-500 mb-1">{icon}</div>
      )}
      <div className="text-sm text-gray-500 dark:text-gray-400">{kpi.label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <div className="text-3xl font-semibold tracking-tight">{kpi.value}</div>
        {kpi.delta && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-700">
            {kpi.delta}
          </span>
        )}
      </div>
      {kpi.note && (
        <div className="text-xs text-gray-500 dark:text-gray-400">{kpi.note}</div>
      )}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  accent?: string;
}) {
  return (
    <div className={`flex items-center gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800`}>
      <div
        className={`p-2 rounded-lg ${
          accent ?? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300"
        }`}
      >
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function ReadinessCard({
  summary,
  title,
  description,
  icon,
  activeDataLabel,
}: {
  summary: ReadinessSummary;
  title: string;
  description: string;
  icon: React.ReactNode;
  activeDataLabel: string;
}) {
  const tone = READINESS_TONES[summary.status];
  const StatusIcon = summary.status === "ok" ? CheckCircle2 : AlertCircle;
  const percent = Math.min(100, Math.max(0, summary.completionPercent));

  return (
    <section className="card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone.iconClass}`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">{title}</h2>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tone.badgeClass}`}
              >
                <StatusIcon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                {summary.statusLabel}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          </div>
        </div>

        <Link
          href={summary.href}
          className="btn-ghost inline-flex min-h-[40px] items-center justify-center gap-1 text-sm font-semibold lg:shrink-0"
        >
          詳細を確認
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>
            {summary.okCount}/{summary.totalCount}項目 OK
          </span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {percent}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className={`h-full rounded-full ${tone.progressClass}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800">
          <dt className="text-xs text-gray-500 dark:text-gray-400">未設定</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">
            {summary.blockingCount}
          </dd>
        </div>
        <div className="rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800">
          <dt className="text-xs text-gray-500 dark:text-gray-400">要確認</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">
            {summary.warnCount}
          </dd>
        </div>
        <div className="rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800">
          <dt className="text-xs text-gray-500 dark:text-gray-400">
            {activeDataLabel}
          </dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">
            {summary.activeDataLabel}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-950 selection:bg-[#fe6147]/20">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="flex items-center" aria-label="rizbo home">
            <img
              src="/logo.svg"
              alt="rizbo"
              width={118}
              height={37}
              className="h-9 w-auto"
            />
          </a>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-700 lg:flex">
            {LP_NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="transition hover:text-[#fe6147]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={LOGIN_HREF}
              className="hidden min-h-[40px] items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:inline-flex"
            >
              ログイン
            </Link>
            <Link
              href={LOGIN_HREF}
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-[#fe6147] px-4 text-sm font-bold text-white shadow-sm shadow-[#fe6147]/25 transition hover:bg-[#e94f36] sm:px-5"
            >
              管理画面へ
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative min-h-[700px] overflow-hidden border-b border-slate-200 pt-20 sm:pt-24 lg:min-h-[660px]">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,#ffffff_0%,#ffffff_42%,#f8fafc_42%,#f8fafc_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white to-white/0" />
        <div className="absolute right-[-350px] top-24 hidden w-[980px] max-w-none opacity-95 lg:block xl:right-[-300px] 2xl:right-[-220px]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_32px_90px_rgba(15,23,42,0.16)]">
            <img
              src="/lp/mockup.png"
              alt="rizboの管理画面"
              width={1478}
              height={782}
              className="h-auto w-full rounded-[18px]"
            />
          </div>
        </div>
        <div className="absolute right-6 top-[400px] hidden w-[360px] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur lg:block xl:right-16 2xl:right-36">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-500">運用レポート</div>
              <div className="mt-1 text-sm font-extrabold text-slate-950">
                次に直すポイントを自動で見える化
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff0ec] text-[#fe6147]">
              <BarChart3 className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <div className="grid gap-3">
            {LP_FUNNEL_STEPS.slice(2).map((step) => (
              <div
                key={step.label}
                className="grid grid-cols-[86px_1fr_48px] items-center gap-3"
              >
                <div className="text-xs font-semibold text-slate-500">
                  {step.label}
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#fe6147]"
                    style={{ width: `${step.rate}%` }}
                  />
                </div>
                <div className="text-right text-sm font-extrabold text-slate-950">
                  {step.rate}%
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-[#ffd5cc] bg-[#fff6f3] p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#c84732]">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              改善候補
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              結果画面の予約CTAと未回答FAQを優先して更新します。
            </p>
          </div>
        </div>

        <div className="relative mx-auto flex min-h-[600px] max-w-7xl flex-col justify-center px-4 pb-6 sm:px-6 lg:min-h-[540px]">
          <div className="max-w-[560px] pt-8 lg:pt-0">
            <h1 className="text-[42px] font-extrabold leading-[1.06] tracking-normal text-slate-950 sm:text-[56px] lg:text-[64px]">
              ダンススクールの
              <span className="block text-[#fe6147]">
                体験予約を増やす
              </span>
              運用システム
            </h1>
            <p className="mt-6 max-w-[540px] text-base leading-8 text-slate-600 sm:text-lg">
              Q&amp;Aチャットボット、相性診断、予約フォーム、運用レポートをひとつに。
              問い合わせ対応を減らしながら、迷っている見込み客を体験予約へつなげます。
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={LOGIN_HREF}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#fe6147] px-6 text-sm font-bold text-white shadow-lg shadow-[#fe6147]/25 transition hover:bg-[#e94f36]"
              >
                管理画面にログイン
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href="#features"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                機能を見る
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_22px_60px_rgba(15,23,42,0.12)] lg:hidden">
              <img
                src="/lp/mockup.png"
                alt="rizboの管理画面"
                width={1478}
                height={782}
                className="h-[150px] w-full rounded-xl object-cover object-left-top sm:h-auto"
              />
            </div>

            <div className="mt-7 hidden max-w-[560px] gap-3 sm:grid sm:grid-cols-3">
              {LP_HERO_METRICS.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-200 bg-white/85 px-4 py-3 shadow-sm backdrop-blur"
                >
                  <div className="text-2xl font-extrabold text-slate-950">
                    {item.value}
                  </div>
                  <div className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 hidden max-w-[560px] gap-3 text-sm font-semibold text-slate-700 sm:grid sm:grid-cols-3">
              {LP_PROOF.map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#fe6147]"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 sm:py-7 lg:grid-cols-[190px_1fr_220px] lg:items-center">
          <h2 className="text-xl font-bold leading-8 text-slate-950">
            こんなお悩み、
            <br className="hidden lg:block" />
            ありませんか？
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {LP_PROBLEMS.map((item) => (
              <div key={item.title} className="flex gap-3">
                <AlertCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#fe6147]"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-sm font-bold text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            rizboがまとめて解決
          </div>
        </div>
      </section>

      <section id="features" className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <h2 className="text-3xl font-extrabold tracking-normal text-slate-950 sm:text-4xl">
                問い合わせから予約後対応まで、ひとつの導線で管理
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                サイト訪問者が迷うポイントを先回りして解消し、予約フォームまでの流れをデータで改善できます。
              </p>
              <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-sm font-bold text-slate-950">
                  予約につながる導線
                </div>
                <div className="mt-4 space-y-3">
                  {["疑問にすぐ答える", "合うクラスを提案する", "申込後の通知を自動化する", "ログから改善する"].map(
                    (item, index) => (
                      <div key={item} className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-[#fe6147] ring-1 ring-slate-200">
                          {index + 1}
                        </span>
                        <span className="text-sm font-semibold text-slate-700">
                          {item}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {LP_FEATURES.map(({ title, text, icon: Icon, color }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div
                    className={[
                      "mb-5 flex h-11 w-11 items-center justify-center rounded-xl",
                      color,
                    ].join(" ")}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-950">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="border-y border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-extrabold tracking-normal text-slate-950">
                導入から改善までの流れ
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                既存サイトに埋め込み、管理画面で設定し、運用ログを見ながら改善します。
              </p>
            </div>
            <a
              href="#cta"
              className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              利用を始める
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {LP_WORKFLOW.map(({ title, text, icon: Icon }, index) => (
              <article
                key={title}
                className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fe6147] text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <Icon className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="reports" className="bg-white py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-extrabold tracking-normal text-slate-950 sm:text-4xl">
              勘ではなく、ログで改善できます
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              未回答ログ、診断ファネル、フォーム到達率、申込数をまとめて確認。
              次に直すべきFAQ、診断、フォーム項目が分かります。
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {LP_REPORT_CARDS.map(([title, text]) => (
                <div
                  key={title}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="text-sm font-bold text-slate-950">{title}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    {text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-[0_22px_70px_rgba(15,23,42,0.12)]">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-950">
                    運用レポート
                  </div>
                  <div className="text-xs text-slate-500">直近30日の状況</div>
                </div>
                <BarChart3 className="h-5 w-5 text-[#fe6147]" aria-hidden="true" />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {LP_REPORT_METRICS.map((metric) => (
                  <div key={metric.label} className="rounded-xl bg-slate-50 p-4">
                    <div className="text-xs font-semibold text-slate-500">
                      {metric.label}
                    </div>
                    <div className="mt-2 text-2xl font-extrabold text-slate-950">
                      {metric.value}
                    </div>
                    <div className="mt-1 text-[11px] font-semibold leading-4 text-slate-400">
                      {metric.note}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-3">
                {LP_FUNNEL_STEPS.map((step) => (
                  <div key={step.label} className="grid grid-cols-[92px_1fr_44px] items-center gap-3">
                    <div className="text-xs font-semibold text-slate-600">
                      {step.label}
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#fe6147]"
                        style={{ width: `${step.rate}%` }}
                      />
                    </div>
                    <div className="text-right text-xs font-bold text-slate-700">
                      {step.rate}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-slate-950">
                    改善候補
                  </div>
                  <span className="rounded-full bg-[#fff0ec] px-2.5 py-1 text-[11px] font-bold text-[#c84732]">
                    優先度順
                  </span>
                </div>
                <div className="space-y-3">
                  {LP_REPORT_INSIGHTS.map((item, index) => (
                    <div
                      key={item.title}
                      className="grid grid-cols-[28px_1fr] gap-3 rounded-xl border border-slate-100 bg-white p-3"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-950">
                          {item.title}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="cta" className="bg-slate-950 px-4 py-16 text-white sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold tracking-normal sm:text-4xl">
              今日から、体験予約の導線を改善しましょう
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              1行のスクリプトを既存サイトに埋め込むだけで、Q&amp;A、診断、フォーム、分析をまとめて運用できます。
            </p>
          </div>
          <Link
            href={LOGIN_HREF}
            className="inline-flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#fe6147] px-6 text-sm font-bold text-white shadow-lg shadow-[#fe6147]/25 transition hover:bg-[#e94f36]"
          >
            管理画面にログイン
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <img src="/logo.svg" alt="rizbo" width={92} height={29} className="h-7 w-auto" />
          <p>© {new Date().getFullYear()} Rizbo Admin System.</p>
        </div>
      </footer>
    </main>
  );
}

// ── メインコンポーネント ──────────────────────────────────────

export default function HomePage() {
  const { data: session, status } = useSession();
  const user = session?.user as UserWithSchool | undefined;
  const schoolId = user?.schoolId;

  const [range, setRange] = useState<number>(7);

  // ダッシュボードデータ
  const [qaKpis, setQaKpis] = useState<KPI[]>([]);
  const [diagnosisKpis, setDiagnosisKpis] = useState<KPI[]>([]);
  const [setup, setSetup] = useState<SetupItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [recentConversions, setRecentConversions] = useState<ConversionUser[]>([]);
  const [hasSessionLogs, setHasSessionLogs] = useState(false);
  const [qaReadiness, setQaReadiness] =
    useState<FaqReadinessSummary | null>(null);
  const [diagnosisReadiness, setDiagnosisReadiness] =
    useState<DiagnosisReadinessSummary | null>(null);
  const [loading, setLoading] = useState(false);

  // 離脱ファネルデータ
  const [dropoff, setDropoff] = useState<DropoffResponse | null>(null);
  const [dropoffLoading, setDropoffLoading] = useState(false);
  const [showAllSteps, setShowAllSteps] = useState(false);

  // コンバージョン詳細展開
  const [expandedConversion, setExpandedConversion] = useState<string | null>(null);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [submissionsTotal, setSubmissionsTotal] = useState(0);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  const [toast, setToast] = useState<{
    type: "ok" | "err" | "info";
    text: string;
  } | null>(null);

  const showToast = (type: "ok" | "err" | "info", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 2400);
  };

  const fetchDashboard = useCallback(async () => {
    if (status !== "authenticated") return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (schoolId) q.set("school", schoolId);
      q.set("days", String(range));

      const res = await fetch(`/api/dashboard?${q.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());

      const data: DashboardResponse = await res.json();
      setQaKpis(data.qaKpis ?? []);
      setDiagnosisKpis(data.diagnosisKpis ?? []);
      setSetup(data.setup ?? []);
      setActivities(data.activities ?? []);
      setSystem(data.system ?? null);
      setRecentConversions(data.recentConversions ?? []);
      setHasSessionLogs(data.hasSessionLogs ?? false);
    } catch {
      showToast("err", "ダッシュボードの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [schoolId, range, status]);

  const fetchDropoff = useCallback(async () => {
    if (status !== "authenticated") return;
    setDropoffLoading(true);
    try {
      const q = new URLSearchParams();
      if (schoolId) q.set("schoolId", schoolId);
      q.set("days", String(range));

      const res = await fetch(`/api/admin/diagnosis/dropoff?${q.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const data: DropoffResponse = await res.json();
      setDropoff(data);
    } catch {
      setDropoff(null);
    } finally {
      setDropoffLoading(false);
    }
  }, [schoolId, range, status]);

  const fetchDiagnosisReadiness = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const q = new URLSearchParams();
      if (schoolId) q.set("schoolId", schoolId);

      const res = await fetch(`/api/admin/diagnosis/readiness?${q.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());

      const data: DiagnosisReadinessSummary = await res.json();
      setDiagnosisReadiness(data);
    } catch {
      setDiagnosisReadiness(null);
    }
  }, [schoolId, status]);

  const fetchQaReadiness = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const q = new URLSearchParams();
      if (schoolId) q.set("schoolId", schoolId);

      const res = await fetch(`/api/admin/qa/readiness?${q.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());

      const data: FaqReadinessSummary = await res.json();
      setQaReadiness(data);
    } catch {
      setQaReadiness(null);
    }
  }, [schoolId, status]);

  const fetchSubmissions = useCallback(
    async (page: number) => {
      if (status !== "authenticated") return;
      setSubmissionsLoading(true);
      try {
        const q = new URLSearchParams();
        if (schoolId) q.set("schoolId", schoolId);
        q.set("days", String(range));
        q.set("page", String(page));
        q.set("limit", "10");

        const res = await fetch(
          `/api/admin/diagnosis/submissions?${q.toString()}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setAllSubmissions(data.submissions ?? []);
        setSubmissionsTotal(data.total ?? 0);
        setSubmissionsPage(page);
      } catch {
        showToast("err", "送信一覧の取得に失敗しました");
      } finally {
        setSubmissionsLoading(false);
      }
    },
    [schoolId, range, status]
  );

  useEffect(() => {
    if (status === "authenticated") {
      fetchDashboard();
      fetchDropoff();
      fetchDiagnosisReadiness();
      fetchQaReadiness();
    }
  }, [
    fetchDashboard,
    fetchDropoff,
    fetchDiagnosisReadiness,
    fetchQaReadiness,
    status,
  ]);

  const subtitle = useMemo(() => {
    if (status === "authenticated" && schoolId)
      return `ログイン中: ${schoolId}`;
    if (status === "authenticated") return "ログイン中";
    return "";
  }, [status, schoolId]);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const embedScriptCode = `<script src="${baseUrl}/embed.js" data-rizbo-school="${schoolId ?? ""}"></script>`;

  const onCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedScriptCode);
      showToast("ok", "埋め込みコードをコピーしました");
    } catch {
      showToast("err", "コピーに失敗しました（ブラウザ権限をご確認ください）");
    }
  };

  const onExportLogs = async () => {
    try {
      const q = new URLSearchParams();
      if (schoolId) q.set("school", schoolId);
      q.set("days", String(range));

      const res = await fetch(`/api/logs?${q.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());

      const rows = (await res.json()) as any[];
      if (!Array.isArray(rows) || rows.length === 0) {
        showToast("info", "対象期間のログがありません");
        return;
      }

      const header = ["timestamp", "sessionId", "question", "answer", "url"];
      const csv = [
        header.join(","),
        ...rows.map((r) =>
          [
            r.timestamp ?? "",
            r.sessionId ?? "",
            JSON.stringify(
              typeof r.question === "string"
                ? r.question
                : r?.question?.text ?? ""
            ).replaceAll('"', '""'),
            JSON.stringify(
              typeof r.answer === "string"
                ? r.answer
                : r.answer != null
                ? JSON.stringify(r.answer)
                : ""
            ).replaceAll('"', '""'),
            r.url ?? "",
          ]
            .map((cell) => `"${String(cell)}"`)
            .join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const d = new Date();
      a.download = `logs_${
        schoolId ?? "all"
      }_${range}d_${d.getFullYear()}${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}${String(d.getDate()).padStart(2, "0")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("ok", "CSVをエクスポートしました");
    } catch {
      showToast("err", "CSVエクスポートに失敗しました");
    }
  };

  // ==========================
  // 未ログインLP（モダンSaaS）
  // ==========================
  if (status === "unauthenticated") {
    return <LandingPage />;
  }

  // 認証状態ロード中
  if (status === "loading") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="card p-5 animate-pulse">
          <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="mt-3 h-3 w-72 rounded bg-gray-100 dark:bg-gray-900" />
        </div>
      </div>
    );
  }

  // ==========================
  // ログイン後 統合ダッシュボード
  // ==========================
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* ヘッダー */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Home aria-hidden="true" className="w-6 h-6" />
            <span>ホーム</span>
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {subtitle || "Q&A・診断の運用状況ダッシュボード"}
          </p>
          {status === "authenticated" && !schoolId && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-200">
              ※ schoolId が未設定です（埋め込み・集計の精度に影響します）
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(Number(e.target.value))}
            className="input w-[130px]"
            title="集計期間"
          >
            {RANGES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              fetchDashboard();
              fetchDropoff();
              fetchDiagnosisReadiness();
              fetchQaReadiness();
            }}
            className="btn-ghost inline-flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            更新
          </button>

          <button
            onClick={onExportLogs}
            className="btn-ghost inline-flex items-center gap-1"
          >
            <FileDown className="h-4 w-4" />
            CSVエクスポート
          </button>

          <a href="/help" className="btn-ghost inline-flex items-center gap-1">
            <ExternalLink className="h-4 w-4" /> ヘルプ
          </a>
        </div>
      </div>

      {/* トースト */}
      {toast && (
        <div
          className={
            "mb-4 rounded-md border px-3 py-2 text-sm " +
            (toast.type === "ok"
              ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-200"
              : toast.type === "err"
              ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200"
              : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-100")
          }
        >
          {toast.text}
        </div>
      )}

      {(qaReadiness || diagnosisReadiness) && (
        <div className="mb-6 grid gap-4 xl:grid-cols-2">
          {qaReadiness && (
            <ReadinessCard
              summary={qaReadiness}
              title="Q&Aチャットボット完成度"
              description="公開設定・回答内容・申込導線・運用ログをまとめて確認できます。"
              icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}
              activeDataLabel="FAQ構成"
            />
          )}
          {diagnosisReadiness && (
            <ReadinessCard
              summary={diagnosisReadiness}
              title="診断設定の完成度"
              description="診断の公開・推薦精度・申込導線に必要な設定をまとめて確認できます。"
              icon={<MousePointerClick className="h-5 w-5" aria-hidden="true" />}
              activeDataLabel="有効データ"
            />
          )}
        </div>
      )}

      {/* ────────────────────────────────────────
          Q&A セクション
      ──────────────────────────────────────── */}
      <section className="card p-6 mb-6">
        <SectionHeader
          icon={<MessageSquare className="h-5 w-5" />}
          title="Q&A チャットボット"
          subtitle={`直近 ${range}日間のチャット状況`}
          accent="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300"
        />

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-800" />
                <div className="mt-3 h-7 w-20 rounded bg-gray-200 dark:bg-gray-800" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {qaKpis.map((k, i) => (
              <KpiCard
                key={i}
                kpi={k}
                icon={
                  i === 0 ? (
                    <Activity className="h-4 w-4" />
                  ) : i === 1 ? (
                    <ClipboardList className="h-4 w-4" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )
                }
              />
            ))}
          </div>
        )}

        {/* 最近のチャットログ */}
        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4 text-gray-400" />
              最近のチャットログ
            </h3>
            <Link
              href="/admin/chat-history"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              すべて見る <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {activities.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              対象期間のアクティビティはありません
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {activities.map((a, i) => (
                <li key={i} className="py-2 text-sm flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400 w-36 shrink-0">
                    {a.time}
                  </span>
                  <span className="ml-3 truncate">{a.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ────────────────────────────────────────
          診断 セクション
      ──────────────────────────────────────── */}
      <section className="card p-6 mb-6">
        <SectionHeader
          icon={<MousePointerClick className="h-5 w-5" />}
          title="パーソナライズ診断"
          subtitle={`直近 ${range}日間のコンバージョン状況`}
          accent="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300"
        />

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-800" />
                <div className="mt-3 h-7 w-20 rounded bg-gray-200 dark:bg-gray-800" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {diagnosisKpis.map((k, i) => (
              <KpiCard
                key={i}
                kpi={k}
                icon={
                  i === 0 ? (
                    <Users className="h-4 w-4" />
                  ) : i === 1 ? (
                    <BarChart3 className="h-4 w-4" />
                  ) : (
                    <Activity className="h-4 w-4" />
                  )
                }
              />
            ))}
          </div>
        )}

        {/* ── コンバージョンユーザー ── */}
        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Users className="h-4 w-4 text-gray-400" />
              直近のコンバージョンユーザー
            </h3>
            <button
              onClick={() => {
                if (allSubmissions.length === 0) fetchSubmissions(1);
              }}
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
            >
              一覧を見る <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          {recentConversions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              対象期間のコンバージョンデータはありません
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    <th className="pb-2 text-left font-medium">日時</th>
                    <th className="pb-2 text-left font-medium">お名前</th>
                    <th className="pb-2 text-left font-medium">メール</th>
                    <th className="pb-2 text-left font-medium">電話番号</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recentConversions.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">{u.time}</td>
                      <td className="py-2 pr-4 font-medium">{u.name}</td>
                      <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">
                        {u.email ? (
                          <a href={`mailto:${u.email}`} className="hover:underline">{u.email}</a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2">
                        {u.tel ? (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-gray-400" />
                            {u.tel}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── 全コンバージョン一覧（展開式） ── */}
        {allSubmissions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4 text-gray-400" />
              全コンバージョン一覧
              <span className="text-xs font-normal text-gray-500 ml-1">（{submissionsTotal}件）</span>
            </h3>
            {submissionsLoading ? (
              <div className="text-sm text-gray-400 py-3">読み込み中...</div>
            ) : (
              <div className="space-y-2">
                {allSubmissions.map((s) => {
                  const fields = (s.fields ?? {}) as Record<string, string>;
                  const isExpanded = expandedConversion === s.id;
                  return (
                    <div key={s.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedConversion(isExpanded ? null : s.id)}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <span className="flex items-center gap-3">
                          <span className="text-gray-500 dark:text-gray-400 text-xs">
                            {new Date(s.createdAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="font-medium">
                            {Object.values(fields)[0]?.toString().slice(0, 30) || "（内容なし）"}
                          </span>
                        </span>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 bg-gray-50 dark:bg-gray-800/30">
                          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            {Object.entries(fields).map(([key, val]) => (
                              <div key={key}>
                                <dt className="text-xs text-gray-500 dark:text-gray-400">{key}</dt>
                                <dd className="text-sm mt-0.5">{String(val)}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* ページング */}
                {submissionsTotal > 10 && (
                  <div className="flex items-center justify-between pt-2 text-sm">
                    <button
                      disabled={submissionsPage <= 1}
                      onClick={() => fetchSubmissions(submissionsPage - 1)}
                      className="btn-ghost text-xs disabled:opacity-40"
                    >
                      ← 前へ
                    </button>
                    <span className="text-gray-500 text-xs">
                      {submissionsPage} / {Math.ceil(submissionsTotal / 10)} ページ
                    </span>
                    <button
                      disabled={submissionsPage >= Math.ceil(submissionsTotal / 10)}
                      onClick={() => fetchSubmissions(submissionsPage + 1)}
                      className="btn-ghost text-xs disabled:opacity-40"
                    >
                      次へ →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 離脱ファネル ── */}
        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-gray-400" />
              診断ステップ別 離脱ファネル
            </h3>
          </div>

          {dropoffLoading ? (
            <div className="text-sm text-gray-400 py-3">読み込み中...</div>
          ) : !hasSessionLogs && (!dropoff || dropoff.totalSessions === 0) ? (
            <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center">
              <TrendingDown className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                診断ステップのトラッキングデータがまだありません。
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                診断フローが利用されると、ここにステップ別の離脱率が表示されます。
              </p>
            </div>
          ) : dropoff ? (
            <div className="space-y-6">

              {/* ── ウィジェット クリック統計 ── */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                  <MousePointerClick className="h-3.5 w-3.5" />
                  ウィジェット クリック
                </h4>
                {dropoff.iconClickStats && dropoff.iconClickStats.some(s => s.totalClicks > 0) ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {dropoff.iconClickStats.map((stat) => (
                      <div
                        key={stat.stepKey}
                        className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 px-4 py-3 flex items-center justify-between"
                      >
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          {stat.stepKey === "CHAT_ICON_CLICK" ? "💬" : "🎯"} {stat.label}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold tabular-nums">{stat.totalClicks.toLocaleString()}</div>
                          <div className="text-[10px] text-gray-400">延べ回数（ユニーク {stat.uniqueSessions} 人）</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500 py-2">
                    まだクリックデータがありません。ウィジェットが設置されたサイトでアイコンがクリックされると表示されます。
                  </p>
                )}
              </div>

              {/* ── 診断ステップ ファネルテーブル ── */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5" />
                  診断ステップ別 離脱ファネル
                  <span className="font-normal ml-1">（直近 {range}日間 / 診断開始セッション: {dropoff.totalSessions.toLocaleString()}）</span>
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                        <th className="pb-2 text-left font-medium">質問</th>
                        <th className="pb-2 text-right font-medium">通過数</th>
                        <th className="pb-2 text-right font-medium">前ステップからの通過率</th>
                        <th className="pb-2 text-right font-medium">離脱率</th>
                        <th className="pb-2 text-left font-medium pl-4">割合</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {dropoff.allSteps.map((step) => (
                        <tr key={step.stepKey} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-2 pr-4">
                            <span className="font-medium text-xs">{step.label}</span>
                          </td>
                          <td className="py-2 pr-4 text-right font-mono">
                            {step.count.toLocaleString()}
                          </td>
                          <td className="py-2 pr-4 text-right">
                            {step.retentionRate !== null ? (
                              <span className={`text-xs font-medium ${
                                step.retentionRate >= 80
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : step.retentionRate >= 50
                                  ? "text-yellow-600 dark:text-yellow-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}>
                                {step.retentionRate}%
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-right">
                            {step.dropoffRate !== null && step.dropoffRate > 0 ? (
                              <span className={`text-xs font-medium ${
                                step.dropoffRate >= 50
                                  ? "text-red-600 dark:text-red-400"
                                  : step.dropoffRate >= 20
                                  ? "text-yellow-600 dark:text-yellow-400"
                                  : "text-gray-500"
                              }`}>
                                -{step.dropoffRate}%
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-2 pl-4">
                            <div className="w-32 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  step.retentionRate !== null && step.retentionRate >= 80
                                    ? "bg-emerald-500"
                                    : step.retentionRate !== null && step.retentionRate >= 50
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                                }`}
                                style={{
                                  width: `${
                                    dropoff.totalSessions > 0
                                      ? Math.round((step.count / dropoff.totalSessions) * 100)
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── フォームフィールド別 入力・離脱分析 ── */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5" />
                  フォームフィールド別 入力・離脱分析
                  {dropoff.formOpenCount !== undefined && dropoff.formOpenCount > 0 && (
                    <span className="font-normal">（フォーム到達 {dropoff.formOpenCount} 人）</span>
                  )}
                </h4>
                {dropoff.formFieldSteps && dropoff.formFieldSteps.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                          <th className="pb-2 text-left font-medium">フィールド名</th>
                          <th className="pb-2 text-right font-medium">到達人数</th>
                          <th className="pb-2 text-right font-medium">到達率</th>
                          <th className="pb-2 text-right font-medium">ここで離脱</th>
                          <th className="pb-2 text-left font-medium pl-4">到達バー</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {dropoff.formFieldSteps.map((step) => (
                          <tr key={step.stepKey} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="py-2 pr-4">
                              <span className="font-medium text-xs">{step.label}</span>
                            </td>
                            <td className="py-2 pr-4 text-right font-mono text-xs">
                              {step.reachedCount.toLocaleString()}
                            </td>
                            <td className="py-2 pr-4 text-right">
                              {step.reachedRate !== null ? (
                                <span className={`text-xs font-medium ${
                                  step.reachedRate >= 80
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : step.reachedRate >= 50
                                    ? "text-yellow-600 dark:text-yellow-400"
                                    : "text-red-600 dark:text-red-400"
                                }`}>
                                  {step.reachedRate}%
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </td>
                            <td className="py-2 pr-4 text-right">
                              {step.abandonCount > 0 ? (
                                <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                  {step.abandonCount} 人
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </td>
                            <td className="py-2 pl-4">
                              <div className="w-32 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    step.reachedRate !== null && step.reachedRate >= 80
                                      ? "bg-emerald-500"
                                      : step.reachedRate !== null && step.reachedRate >= 50
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{ width: `${step.reachedRate ?? 0}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500 py-2">
                    まだデータがありません。申し込みフォームへの入力が行われると表示されます。
                  </p>
                )}
              </div>

            </div>
          ) : null}
        </div>

      </section>

      {/* ────────────────────────────────────────
          セットアップ状況 & システム情報
      ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* セットアップ */}
        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <h2 className="text-base font-semibold">セットアップ状況</h2>
          </div>
          {setup.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">読み込み中…</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {setup.map((s, idx) => (
                <li key={idx} className="flex items-center justify-between gap-2">
                  <a href={s.href} className="text-sm hover:underline flex items-center gap-2">
                    {s.done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                    {s.label}
                  </a>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      s.done
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-700"
                        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-100 dark:border-amber-700"
                    }`}
                  >
                    {s.done ? "完了" : "未設定"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* システム情報 & 埋め込みコード */}
        <div className="card p-5 flex flex-col gap-5">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <h2 className="text-base font-semibold">システム情報</h2>
            </div>
            {system ? (
              <dl className="text-sm space-y-2">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">バージョン</dt>
                  <dd>{system.version}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">環境</dt>
                  <dd className="capitalize">{system.env}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-gray-500">情報の取得に失敗しました。</p>
            )}
          </div>

          {/* 埋め込みコード */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <Copy className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold">埋め込みコード</h3>
            </div>
            <textarea
              readOnly
              rows={3}
              value={embedScriptCode}
              className="input font-mono text-xs w-full resize-none"
            />
            <button
              onClick={onCopyEmbed}
              className="btn-ghost mt-2 w-full text-xs inline-flex items-center justify-center gap-1"
            >
              <Copy className="h-3 w-3" /> コピー
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
