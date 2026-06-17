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
  Bot,
  FileText,
  Filter,
  LineChart,
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
  Search,
  Target,
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

const LP_VALUE_CARDS = [
  {
    value: "24h",
    label: "問い合わせ自動応答",
    text: "24時間自動応答で問い合わせ対応を削減",
    icon: MessageSquare,
    tone: "text-[#fe6147] bg-[#fff0ec] border-[#ffd7cf]",
  },
  {
    value: "1導線",
    label: "診断から予約まで統合",
    text: "診断で最適なクラスへ案内",
    icon: RefreshCw,
    tone: "text-emerald-600 bg-emerald-50 border-emerald-100",
  },
  {
    value: "30日",
    label: "ログを見て改善",
    text: "フォーム送信とメール通知を自動化",
    icon: BarChart3,
    tone: "text-blue-600 bg-blue-50 border-blue-100",
  },
];

const LP_HERO_CHECKS = [
  { text: "24時間自動応答で問い合わせ対応を削減", icon: MessageSquare },
  { text: "診断で最適なクラスへ案内", icon: Target },
  { text: "フォーム送信とメール通知を自動化", icon: Mail },
  { text: "ログを見て改善", icon: BarChart3 },
];

const LP_DASHBOARD_METRICS = [
  { label: "セッション（7日）", value: "2,456", delta: "+18%" },
  { label: "人気の質問シェア", value: "22%", delta: "+4%" },
  { label: "未解決/要修正", value: "8件", delta: "-3件" },
  { label: "ログ作成", value: "12", delta: "+5" },
];

const LP_PROBLEMS = [
  {
    title: "同じ質問への対応に時間が取られる",
    text: "営業時間外の問い合わせや体験前の不安に、スタッフが個別対応している。",
    icon: MessageSquare,
    tone: "text-[#fe6147] bg-[#fff0ec]",
  },
  {
    title: "どのクラスが合うか分からず離脱する",
    text: "初心者・経験者・年齢・目的ごとの案内が難しく、予約前の迷いが残る。",
    icon: Users,
    tone: "text-[#fe6147] bg-[#fff0ec]",
  },
  {
    title: "フォーム後の対応が属人化する",
    text: "申込内容の確認、通知、返信、日程調整が手作業になりやすい。",
    icon: Mail,
    tone: "text-[#fe6147] bg-[#fff0ec]",
  },
  {
    title: "改善すべきポイントが見えない",
    text: "どこで迷われたか、どの質問が多いか、予約につながったかを追えない。",
    icon: Search,
    tone: "text-emerald-600 bg-emerald-50",
  },
];

const LP_FEATURES = [
  {
    title: "AIチャットボット",
    text: "料金、アクセス、持ち物、体験の流れなどをサイト上で即時回答。よくある質問は管理画面から更新できます。",
    icon: MessageSquare,
    preview: "chat",
    miniTitle: "自動回答",
    miniValue: "24時間対応",
  },
  {
    title: "パーソナル診断",
    text: "年齢、目的、経験、ジャンルの好みから、来校前のユーザーに合うクラスや講師を提案します。",
    icon: MousePointerClick,
    preview: "diagnosis",
    miniTitle: "おすすめクラス",
    miniValue: "HIPHOP 初級",
  },
  {
    title: "予約フォーム",
    text: "シンプルで入力しやすいフォームで離脱を防止。送信内容は自動で集計・通知されます。",
    icon: Mail,
    preview: "form",
    miniTitle: "フォーム到達",
    miniValue: "1,734",
  },
  {
    title: "運用レポート",
    text: "ファネル、FAQランキング、未解決質問などを可視化。改善提案も自動で表示します。",
    icon: BarChart3,
    preview: "report",
    miniTitle: "改善候補",
    miniValue: "4件",
  },
];

const LP_MANAGEMENT_STEPS = [
  {
    title: "疑問にすぐ答える",
    text: "AIチャットボットが24時間自動で回答",
    icon: MessageSquare,
    tone: "text-[#fe6147]",
  },
  {
    title: "合うクラスを提案する",
    text: "パーソナル診断で最適なクラスを案内",
    icon: CheckCircle2,
    tone: "text-emerald-500",
  },
  {
    title: "申込後の通知を自動化する",
    text: "受付完了メールや社内通知を自動送信",
    icon: Mail,
    tone: "text-blue-500",
  },
  {
    title: "ログから改善する",
    text: "データを可視化し、次の改善につなげる",
    icon: BarChart3,
    tone: "text-blue-600",
  },
];

const LP_REPORT_FUNNEL = [
  { label: "サイト訪問", value: "4,562", rate: "100%", color: "#4f7df0" },
  { label: "フォーム到達", value: "1,734", rate: "27%", color: "#3fc7a0" },
  { label: "申込完了", value: "721", rate: "10%", color: "#f7bf45" },
  { label: "体験予約確定", value: "512", rate: "11%", color: "#fe6147" },
];

const LP_FUNNEL_STEPS = [
  { label: "サイト訪問", value: "4,562", rate: 100 },
  { label: "フォーム到達", value: "1,734", rate: 38 },
  { label: "申込完了", value: "721", rate: 16 },
  { label: "体験予約確定", value: "512", rate: 11 },
];

const LP_QA_RANKING = [
  { question: "体験レッスンの流れは？", count: "812", rate: "96%" },
  { question: "料金はいくらですか？", count: "643", rate: "94%" },
  { question: "持ち物は何が必要ですか？", count: "531", rate: "91%" },
  { question: "初心者でも大丈夫？", count: "498", rate: "89%" },
  { question: "キャンセルや変更はできますか？", count: "312", rate: "88%" },
];

const LP_CHANNEL_ROWS = [
  { channel: "Q&Aチャット", bookings: "168", cvr: "12.4%" },
  { channel: "パーソナル診断", bookings: "102", cvr: "18.7%" },
  { channel: "予約フォーム", bookings: "56", cvr: "8.9%" },
  { channel: "直接流入", bookings: "26", cvr: "5.4%" },
];

const LP_UNRESOLVED_QUESTIONS = [
  { text: "入会金はいくら必要ですか？", tag: "未解決" },
  { text: "クラスのレベル分けは？", tag: "要確認" },
  { text: "発表会の参加について", tag: "要修正" },
];

const LP_REPORT_INSIGHTS = [
  {
    title: "結果画面の予約CTAを目立つ位置に配置する",
    text: "診断後の次アクションを迷わず選べる状態にします。",
    tone: "text-[#fe6147]",
  },
  {
    title: "未回答FAQ（8件）を追加する",
    text: "よく聞かれる質問を事前に解消します。",
    tone: "text-emerald-600",
  },
  {
    title: "体験後のフォローメールをパーソナライズする",
    text: "目的別の案内で再来校につなげます。",
    tone: "text-emerald-600",
  },
  {
    title: "フォームの入力項目を最適化する",
    text: "離脱が多い入力欄を見直します。",
    tone: "text-emerald-600",
  },
];

const LP_WORKFLOW = [
  {
    title: "初期設定",
    text: "基本情報の登録、Q&A・診断・フォームの初期設定を行います。",
    icon: ClipboardList,
  },
  {
    title: "サイトに設置",
    text: "タグや埋め込みコードを設置して、すぐに公開できます。",
    icon: Copy,
  },
  {
    title: "運用・改善",
    text: "レポートを見ながら改善を重ね、体験予約を増やしていきます。",
    icon: BarChart3,
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

function MiniLineChart({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 92"
      className={className}
      role="img"
      aria-label="体験予約数の推移"
    >
      <path d="M8 70H212" stroke="#eef2f7" strokeWidth="1" />
      <path d="M8 46H212" stroke="#eef2f7" strokeWidth="1" />
      <path d="M8 22H212" stroke="#eef2f7" strokeWidth="1" />
      <path
        d="M10 70 C28 62 32 38 48 44 S75 64 91 48 111 22 130 28 151 54 169 42 189 20 211 16"
        fill="none"
        stroke="#fe6147"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        d="M10 76 C31 68 44 64 58 66 S84 70 102 62 134 62 155 58 185 44 211 46"
        fill="none"
        stroke="#94a3b8"
        strokeDasharray="4 5"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function HeroDashboardPreview() {
  const nav = ["ダッシュボード", "Q&Aチャット", "診断管理", "フォーム管理", "リード管理", "運用レポート"];

  return (
    <div className="relative rounded-[18px] border border-slate-200 bg-white shadow-[0_26px_80px_rgba(15,23,42,0.12)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="rizbo" width={86} height={27} className="h-6 w-auto" />
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
            dashboard
          </span>
        </div>
        <div className="hidden items-center gap-2 text-[10px] font-semibold text-slate-500 sm:flex">
          <span className="rounded-md border border-slate-200 px-2 py-1">2026/06/01 - 2026/06/14</span>
          <span className="rounded-full bg-slate-950 px-2 py-1 text-white">ログアウト</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:min-h-[360px] sm:grid-cols-[150px_1fr]">
        <aside className="hidden border-r border-slate-100 bg-slate-50/80 p-3 sm:block">
          <div className="space-y-1">
            {nav.map((item, index) => (
              <div
                key={item}
                className={[
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold",
                  index === 0
                    ? "bg-[#fe6147] text-white"
                    : "text-slate-500",
                ].join(" ")}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                {item}
              </div>
            ))}
          </div>
        </aside>

        <div className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-base font-extrabold text-slate-950">ダッシュボード</div>
              <div className="mt-1 text-[11px] font-semibold text-slate-400">rizbo dance studio</div>
            </div>
            <div className="hidden rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-500 md:block">
              直近14日
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            {LP_DASHBOARD_METRICS.map((metric) => (
              <div key={metric.label} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                <div className="text-[10px] font-bold text-slate-400">{metric.label}</div>
                <div className="mt-2 text-lg font-extrabold tabular-nums text-slate-950 md:text-xl">
                  {metric.value}
                </div>
                <div className="mt-1 text-[10px] font-bold text-emerald-600">
                  前月比 {metric.delta}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 hidden gap-3 sm:grid lg:grid-cols-[1fr_0.84fr]">
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-extrabold text-slate-950">体験予約数の推移</div>
                <LineChart className="h-4 w-4 text-[#fe6147]" aria-hidden="true" />
              </div>
              <MiniLineChart className="h-[112px] w-full" />
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-3 text-xs font-extrabold text-slate-950">流入チャネル別 体験予約数</div>
              <div className="grid grid-cols-[88px_1fr] items-center gap-3">
                <div className="relative h-20 w-20 rounded-full bg-[conic-gradient(#fe6147_0_34%,#69d3c5_34%_58%,#6b8cff_58%_80%,#e5e7eb_80%_100%)]">
                  <div className="absolute inset-4 flex items-center justify-center rounded-full bg-white text-lg font-extrabold text-slate-950">
                    352
                  </div>
                </div>
                <div className="space-y-2">
                  {["Q&Aチャット", "診断", "フォーム", "その他"].map((item, index) => (
                    <div key={item} className="grid grid-cols-[8px_1fr_auto] items-center gap-2 text-[10px] font-semibold text-slate-500">
                      <span
                        className={[
                          "h-2 w-2 rounded-full",
                          ["bg-[#fe6147]", "bg-[#69d3c5]", "bg-[#6b8cff]", "bg-slate-300"][index],
                        ].join(" ")}
                      />
                      <span>{item}</span>
                      <span>{[168, 102, 56, 26][index]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 hidden gap-3 lg:grid lg:grid-cols-3">
            {LP_REPORT_INSIGHTS.map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="text-[11px] font-extrabold text-slate-950">{item.title}</div>
                <p className="mt-1 text-[10px] leading-4 text-slate-500">{item.text}</p>
                <a href="#reports" className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-[#fe6147]">
                  詳細を見る
                  <ChevronRight className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportTablePanel() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <div className="grid gap-0 lg:grid-cols-[0.88fr_1fr_1fr]">
        <div className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
          <div className="mb-4 text-sm font-extrabold text-slate-950">ファネルサマリー</div>
          <div className="space-y-3">
            {LP_FUNNEL_STEPS.map((step) => (
              <div key={step.label} className="grid grid-cols-[92px_1fr_54px] items-center gap-3">
                <span className="text-xs font-semibold text-slate-500">{step.label}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#fe6147] to-slate-800"
                    style={{ width: `${Math.max(step.rate, 5)}%` }}
                  />
                </div>
                <span className="text-right text-xs font-bold tabular-nums text-slate-700">
                  {step.value}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] leading-5 text-slate-400">
            CVRはセッションに対する割合
          </p>
        </div>

        <div className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-extrabold text-slate-950">Q&A人気ランキング</div>
            <span className="text-[11px] font-bold text-slate-400">回答率</span>
          </div>
          <div className="divide-y divide-slate-100">
            {LP_QA_RANKING.map((row) => (
              <div key={row.question} className="grid grid-cols-[1fr_56px_44px] gap-3 py-2 text-xs">
                <span className="font-semibold text-slate-700">{row.question}</span>
                <span className="text-right tabular-nums text-slate-500">{row.count}</span>
                <span className="text-right font-bold text-slate-700">{row.rate}</span>
              </div>
            ))}
          </div>
          <a href="#cta" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#fe6147]">
            すべて見る
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>

        <div className="p-5">
          <div className="mb-4 text-sm font-extrabold text-slate-950">チャネル別 体験予約CVR</div>
          <div className="divide-y divide-slate-100">
            {LP_CHANNEL_ROWS.map((row) => (
              <div key={row.channel} className="grid grid-cols-[1fr_58px_54px] gap-3 py-2 text-xs">
                <span className="font-semibold text-slate-700">{row.channel}</span>
                <span className="text-right tabular-nums text-slate-500">{row.bookings}</span>
                <span className="text-right font-bold text-slate-700">{row.cvr}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-0 border-t border-slate-100 lg:grid-cols-[1fr_0.68fr]">
        <div className="p-5">
          <div className="mb-4 text-sm font-extrabold text-slate-950">期間ハイライト（2026/06/01 - 2026/06/14）</div>
          <div className="grid gap-3 sm:grid-cols-4">
            {LP_DASHBOARD_METRICS.map((metric) => (
              <div key={metric.label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-bold text-slate-500">{metric.label}</div>
                <div className="mt-2 text-2xl font-extrabold tabular-nums text-slate-950">
                  {metric.value}
                  <span className="ml-1 text-xs font-bold text-emerald-600">({metric.delta})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100 p-5 lg:border-l lg:border-t-0">
          <div className="mb-3 text-sm font-extrabold text-slate-950">主な改善アクション</div>
          <div className="space-y-2">
            {LP_REPORT_INSIGHTS.map((item) => (
              <div key={item.title} className="flex gap-2 text-xs leading-5 text-slate-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#fe6147]" aria-hidden="true" />
                <span>
                  <strong className="text-slate-950">{item.title}</strong> / {item.text}
                </span>
              </div>
            ))}
          </div>
          <a href="#reports" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#fe6147]">
            詳細レポートを見る
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-950 selection:bg-[#fe6147]/20">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[70px] w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a href="/" className="flex items-center" aria-label="rizbo home">
            <img src="/logo.svg" alt="rizbo" width={118} height={37} className="h-9 w-auto" />
          </a>

          <nav className="hidden items-center gap-9 text-sm font-extrabold text-slate-800 lg:flex">
            {LP_NAV.map((item, index) => (
              <a
                key={`${item.href}-${item.label}-${index}`}
                href={item.href}
                className="transition hover:text-[#fe6147]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <Link
            href={LOGIN_HREF}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-[#fe6147] bg-white px-4 text-sm font-extrabold text-[#fe6147] transition hover:bg-[#fff4f0] sm:px-6"
          >
            管理画面にログイン
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200 bg-white pt-[70px]">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.06) 1px, transparent 0)",
            backgroundSize: "26px 26px",
            maskImage: "linear-gradient(90deg, rgba(0,0,0,0.45), transparent 72%)",
            WebkitMaskImage: "linear-gradient(90deg, rgba(0,0,0,0.45), transparent 72%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-[70px] left-0 w-[44%] opacity-50"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(254,97,71,0.10) 0px, rgba(254,97,71,0.10) 1px, transparent 1px, transparent 18px)",
          }}
        />

        <div className="relative mx-auto grid min-h-[650px] max-w-[1440px] items-center gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[0.44fr_0.56fr] lg:px-12 lg:py-12">
          <div className="max-w-[520px]">
            <h1 className="text-[42px] font-extrabold leading-[1.12] tracking-normal text-slate-950 sm:text-[58px] lg:text-[56px] xl:text-[58px]">
              <span className="block whitespace-nowrap">体験予約を増やす</span>
              <span className="block whitespace-nowrap">運用システム</span>
            </h1>
            <p className="mt-6 text-base font-medium leading-8 text-slate-700 sm:text-lg">
              Q&amp;Aで疑問を解消し、診断で興味を高め、フォームで申し込みへ。
              すべての接点をデータで可視化し、成果を最大化します。
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {LP_HERO_CHECKS.map(({ text, icon: Icon }) => (
                <div key={text} className="flex items-start gap-2 text-sm font-bold leading-6 text-slate-700">
                  <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#fe6147] text-white">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  </span>
                  <span>{text}</span>
                  <Icon className="sr-only" aria-hidden="true" />
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Link
                href={LOGIN_HREF}
                className="inline-flex min-h-[56px] w-full max-w-[390px] items-center justify-center gap-3 rounded-lg bg-[#fe6147] px-7 text-base font-extrabold text-white shadow-[0_14px_30px_rgba(254,97,71,0.22)] transition hover:bg-[#e94f36]"
              >
                管理画面にログイン
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <p className="mt-3 text-xs font-semibold text-slate-400">
                ログインが必要です
              </p>
            </div>
          </div>

          <div className="relative">
            <HeroDashboardPreview />
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
          <h2 className="text-center text-2xl font-extrabold tracking-normal text-slate-950">
            こんなお悩みはありませんか？
          </h2>
          <div className="mt-8 grid gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-4">
            {LP_PROBLEMS.map(({ title, text, icon: Icon }) => (
              <article key={title} className="border-b border-slate-200 p-6 text-center md:border-b-0 md:border-r last:md:border-r-0">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-slate-800">
                  <Icon className="h-8 w-8 stroke-[1.7]" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-sm font-extrabold leading-6 text-slate-950">
                  {title}
                </h3>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-b border-slate-200 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <h2 className="text-center text-3xl font-extrabold tracking-normal text-slate-950">
            rizboでできること
          </h2>
          <div className="mt-9 grid gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-5">
            {LP_FEATURES.map(({ title, text, icon: Icon, miniTitle, miniValue }, index) => (
              <article
                key={title}
                className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r last:lg:border-r-0"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff0ec] text-[#fe6147]">
                  <Icon className="h-7 w-7 stroke-[1.8]" aria-hidden="true" />
                </div>
                <h3 className="text-base font-extrabold text-slate-950">{title}</h3>
                <p className="mt-3 min-h-[84px] text-xs leading-6 text-slate-600">
                  {text}
                </p>
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[11px] font-bold text-slate-500">{miniTitle}</div>
                  <div className="mt-2 text-sm font-extrabold text-slate-950">{miniValue}</div>
                  {index === 1 && (
                    <div className="mt-2 space-y-1">
                      {["HIPHOP", "JAZZ"].map((label, i) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="w-12 text-[10px] font-bold text-slate-500">{label}</span>
                          <div className="h-1.5 flex-1 rounded-full bg-slate-200">
                            <div className="h-full rounded-full bg-[#fe6147]" style={{ width: `${78 - i * 13}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {index === 3 && <MiniLineChart className="mt-1 h-12 w-full" />}
                  {index === 4 && (
                    <div className="mt-2 space-y-1">
                      {["診断の設問を見直す", "Q&A回答率に導線を設置"].map((item) => (
                        <div key={item} className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                          <CheckCircle2 className="h-3 w-3 text-[#fe6147]" aria-hidden="true" />
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="reports" className="border-b border-slate-200 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <h2 className="text-center text-3xl font-extrabold tracking-normal text-slate-950">
            運用レポートで、施策の成果と改善点がすぐわかる
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-7 text-slate-600">
            ファネル、Q&amp;A、流入チャネル、期間ハイライトをひとつの画面で確認。
            次に直すべきポイントまで運用者がすぐ判断できます。
          </p>
          <div className="mt-9">
            <ReportTablePanel />
          </div>
        </div>
      </section>

      <section id="workflow" className="border-b border-slate-200 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <h2 className="text-center text-3xl font-extrabold tracking-normal text-slate-950">
            導入から改善までの流れ
          </h2>
          <div className="mt-10 grid gap-7 md:grid-cols-4">
            {LP_WORKFLOW.map(({ title, text, icon: Icon }, index) => (
              <article key={title} className="relative text-center">
                {index < LP_WORKFLOW.length - 1 && (
                  <div className="absolute left-[calc(50%+36px)] top-8 hidden h-px w-[calc(100%-72px)] bg-slate-300 md:block" />
                )}
                <div
                  className={[
                    "relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-full border text-lg font-extrabold",
                    index === 0
                      ? "border-[#fe6147] bg-[#fe6147] text-white"
                      : "border-slate-200 bg-white text-slate-950",
                  ].join(" ")}
                >
                  {index + 1}
                </div>
                <Icon className="mx-auto mt-5 h-9 w-9 stroke-[1.6] text-slate-700" aria-hidden="true" />
                <h3 className="mt-5 text-base font-extrabold text-slate-950">{title}</h3>
                <p className="mx-auto mt-3 max-w-[230px] text-sm leading-7 text-slate-600">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="bg-white px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-5 rounded-xl border border-[#fe6147] bg-white px-6 py-7 text-center sm:flex-row sm:text-left">
          <h2 className="text-xl font-extrabold tracking-normal text-slate-950 sm:text-2xl">
            データで運用を最適化し、体験予約を増やしましょう
          </h2>
          <div className="flex shrink-0 flex-col items-center gap-2">
            <Link
              href={LOGIN_HREF}
              className="inline-flex min-h-[48px] items-center justify-center gap-3 rounded-lg bg-[#fe6147] px-8 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(254,97,71,0.20)] transition hover:bg-[#e94f36]"
            >
              管理画面にログイン
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <span className="text-[11px] font-semibold text-slate-400">ログインが必要です</span>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <img src="/logo.svg" alt="rizbo" width={92} height={29} className="h-7 w-auto" />
          <p>© {new Date().getFullYear()} Rizbo Admin System.</p>
        </div>
      </footer>
    </main>
  );
}

function LandingSectionTitle({
  title,
  subtitle,
  className = "",
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={`mx-auto max-w-3xl text-center ${className}`}>
      <h2 className="text-[24px] font-extrabold leading-tight tracking-normal text-slate-950 sm:text-[30px]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-sm font-semibold leading-7 text-slate-600 sm:text-base">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function LandingHeroMockup() {
  return (
    <div className="relative min-w-0 max-w-full lg:-mr-2">
      <div
        aria-hidden="true"
        className="absolute -right-16 top-12 h-[280px] w-[390px] -skew-x-12 bg-sky-100/80"
      />
      <div className="relative min-w-0 overflow-hidden rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_24px_76px_rgba(15,23,42,0.13)]">
        <img
          src="/lp/mockup.png"
          alt="rizbo管理画面のプレビュー"
          width={1182}
          height={626}
          className="aspect-[1.88/1] w-full rounded-[16px] object-cover object-left-top"
        />
      </div>

    </div>
  );
}

function LandingFeaturePreview({ preview }: { preview: string }) {
  if (preview === "chat") {
    return (
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-2">
          <div className="w-4/5 rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-semibold text-slate-500">
            体験に必要な持ち物は？
          </div>
          <div className="ml-auto w-3/4 rounded-lg bg-emerald-500 px-3 py-2 text-[10px] font-bold text-white">
            動きやすい服装でOKです
          </div>
        </div>
      </div>
    );
  }

  if (preview === "diagnosis") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {["小学生", "大人", "はじめて", "経験者"].map((item, index) => (
          <div
            key={item}
            className={[
              "rounded-lg border px-3 py-2 text-center text-[10px] font-bold",
              index === 0
                ? "border-[#fe6147] bg-[#fff0ec] text-[#fe6147]"
                : "border-slate-200 bg-white text-slate-500",
            ].join(" ")}
          >
            {item}
          </div>
        ))}
      </div>
    );
  }

  if (preview === "form") {
    return (
      <div className="space-y-2">
        {["お名前", "メールアドレス", "希望日時"].map((item) => (
          <div key={item} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-400">
            {item}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-24 items-end justify-end gap-2">
      {[34, 52, 74, 45].map((height, index) => (
        <div key={height} className="w-5 rounded-t-md bg-blue-400/80" style={{ height: `${height}%` }}>
          <span className="sr-only">{index + 1}</span>
        </div>
      ))}
      <div className="ml-2 h-12 w-12 rounded-full bg-[conic-gradient(#fe6147_0_35%,#4f7df0_35%_72%,#3fc7a0_72%_100%)]" />
    </div>
  );
}

function LandingReportPanel() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_1fr_0.92fr]">
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
        <h3 className="text-sm font-extrabold text-slate-950">予約ファネル（7日間）</h3>
        <div className="mt-5 flex justify-center">
          <div className="flex w-[132px] flex-col items-center gap-1">
            {LP_REPORT_FUNNEL.map((step, index) => (
              <div
                key={step.label}
                className="h-8"
                style={{
                  width: `${112 - index * 18}px`,
                  backgroundColor: step.color,
                  clipPath: "polygon(0 0, 100% 0, 84% 100%, 16% 100%)",
                }}
              />
            ))}
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {LP_REPORT_FUNNEL.map((step) => (
            <div key={step.label} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-xs">
              <span className="whitespace-nowrap font-bold text-slate-600">{step.label}</span>
              <span className="font-extrabold tabular-nums text-slate-950">{step.value}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-500">
                {step.rate}
              </span>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
        <h3 className="text-sm font-extrabold text-slate-950">FAQランキング</h3>
        <div className="mt-4 space-y-3">
          {LP_QA_RANKING.map((row, index) => (
            <div key={row.question} className="grid grid-cols-[24px_1fr_auto] items-center gap-2 text-xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-extrabold text-blue-600">
                {index + 1}
              </span>
              <span className="truncate font-bold text-slate-600">{row.question}</span>
              <span className="font-extrabold tabular-nums text-slate-950">{row.count}</span>
            </div>
          ))}
        </div>
        <a
          href={LOGIN_HREF}
          className="mt-5 inline-flex min-h-[38px] w-full items-center justify-center rounded-lg border border-slate-200 text-xs font-extrabold text-slate-700 transition hover:border-[#fe6147] hover:text-[#fe6147]"
        >
          すべてのFAQを見る
        </a>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
        <h3 className="text-sm font-extrabold text-slate-950">未解決・要修正の質問</h3>
        <div className="mt-4 space-y-3">
          {LP_UNRESOLVED_QUESTIONS.map((row) => (
            <div key={row.text} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-3">
              <span className="text-xs font-bold text-slate-600">{row.text}</span>
              <span className="shrink-0 rounded-full bg-[#fff0ec] px-2 py-1 text-[10px] font-extrabold text-[#fe6147]">
                {row.tag}
              </span>
            </div>
          ))}
        </div>
        <a
          href={LOGIN_HREF}
          className="mt-5 inline-flex min-h-[38px] w-full items-center justify-center rounded-lg border border-slate-200 text-xs font-extrabold text-slate-700 transition hover:border-[#fe6147] hover:text-[#fe6147]"
        >
          質問を管理する
        </a>
      </article>

      <article className="rounded-xl border border-[#ffd8cf] bg-[#fff5f2] p-5 shadow-[0_14px_40px_rgba(254,97,71,0.07)]">
        <h3 className="text-sm font-extrabold text-[#fe6147]">おすすめの改善アクション</h3>
        <div className="mt-4 space-y-3">
          {LP_REPORT_INSIGHTS.map(({ title, tone }) => (
            <div key={title} className="flex gap-2 text-xs font-bold leading-5 text-slate-700">
              <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} aria-hidden="true" />
              <span>{title}</span>
            </div>
          ))}
        </div>
        <a
          href={LOGIN_HREF}
          className="mt-5 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg bg-[#fe6147] text-xs font-extrabold text-white shadow-[0_12px_26px_rgba(254,97,71,0.2)] transition hover:bg-[#e94f36]"
        >
          レポートを詳しく見る
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </article>
    </div>
  );
}

function LandingPageDesigned() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-950 selection:bg-[#fe6147]/20">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[62px] w-full max-w-[1320px] items-center justify-between px-5 sm:px-8">
          <a href="/" aria-label="rizbo home" className="flex items-center">
            <img src="/logo.svg" alt="rizbo" width={98} height={31} className="h-7 w-auto sm:h-8" />
          </a>
          <nav className="hidden items-center gap-8 text-[13px] font-extrabold text-slate-800 lg:flex">
            {LP_NAV.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-[#fe6147]">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href={LOGIN_HREF}
              className="hidden min-h-[40px] items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-800 transition hover:border-[#fe6147] hover:text-[#fe6147] sm:inline-flex"
            >
              ログイン
            </Link>
            <Link
              href={LOGIN_HREF}
              className="inline-flex min-h-[38px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#fe6147] px-3 text-xs font-extrabold text-white shadow-[0_12px_24px_rgba(254,97,71,0.2)] transition hover:bg-[#e94f36] sm:min-h-[40px] sm:gap-2 sm:px-5 sm:text-sm"
            >
              管理画面へ
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200 pt-[62px]">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-75"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(254,97,71,0.09) 0px, rgba(254,97,71,0.09) 1px, transparent 1px, transparent 18px)",
            maskImage: "linear-gradient(90deg, rgba(0,0,0,0.7), transparent 58%)",
            WebkitMaskImage: "linear-gradient(90deg, rgba(0,0,0,0.7), transparent 58%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -right-20 bottom-0 h-[360px] w-[440px] bg-sky-100/70"
          style={{ clipPath: "polygon(34% 0, 100% 0, 100% 100%, 0 100%)" }}
        />

        <div className="relative mx-auto grid max-w-[1320px] items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.4fr_0.6fr] lg:py-14">
          <div className="min-w-0">
            <h1 className="text-[39px] font-extrabold leading-[1.12] tracking-normal text-slate-950 sm:text-[56px] lg:text-[50px] xl:text-[56px]">
              <span className="block">ダンススクールの</span>
              <span className="block text-[#fe6147]">体験予約を増やす</span>
              <span className="block">運用システム</span>
            </h1>
            <p className="mt-6 max-w-[520px] text-base font-semibold leading-8 text-slate-700">
              Q&amp;Aチャットボット、相性診断、予約フォーム、運用レポートをひとつに。
              問い合わせ対応を減らしながら、迷っている見込み客を体験予約へつなげます。
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={LOGIN_HREF}
                className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-lg bg-[#fe6147] px-7 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(254,97,71,0.24)] transition hover:bg-[#e94f36]"
              >
                管理画面にログイン
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href="#features"
                className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-7 text-sm font-extrabold text-slate-950 shadow-sm transition hover:border-[#fe6147] hover:text-[#fe6147]"
              >
                機能を見る
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          <LandingHeroMockup />
        </div>
      </section>

      <section className="relative border-b border-slate-200 bg-white py-12 sm:py-14">
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 h-44 w-48 opacity-60"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(79,125,240,0.32) 1.2px, transparent 1.2px)",
            backgroundSize: "12px 12px",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute right-0 top-28 h-44 w-48 opacity-55"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(254,97,71,0.30) 1.2px, transparent 1.2px)",
            backgroundSize: "12px 12px",
          }}
        />
        <div className="relative mx-auto max-w-[1220px] px-5 sm:px-8">
          <LandingSectionTitle
            title="予約につながる導線を、下支えします"
            subtitle="問い合わせ対応、診断案内、フォーム後の通知までをひとつの流れで整えます。"
          />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {LP_VALUE_CARDS.map(({ value, label, text, icon: Icon, tone }) => (
              <article
                key={value}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.06)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[32px] font-extrabold leading-none text-slate-950">{value}</div>
                    <div className="mt-3 text-sm font-extrabold text-slate-700">{label}</div>
                  </div>
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${tone}`}>
                    <Icon className="h-7 w-7" aria-hidden="true" />
                  </div>
                </div>
                <div className="mt-5 flex items-start gap-2 text-sm font-extrabold leading-6 text-slate-800">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#fe6147]" aria-hidden="true" />
                  <span>{text}</span>
                </div>
              </article>
            ))}
          </div>
          <ChevronDown className="mx-auto mt-5 h-6 w-6 text-slate-500" aria-hidden="true" />
        </div>
      </section>

      <section className="border-b border-slate-100 bg-white py-12">
        <div className="mx-auto max-w-[1220px] px-5 sm:px-8">
          <LandingSectionTitle title="こんなお悩み、ありませんか？" />
          <div className="mt-8 grid gap-5 md:grid-cols-4">
            {LP_PROBLEMS.map(({ title, text, icon: Icon, tone }) => (
              <article key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-sm font-extrabold leading-6 text-slate-950">{title}</h3>
                <p className="mt-3 text-xs font-semibold leading-6 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-b border-slate-100 bg-white py-12 sm:py-14">
        <div className="mx-auto max-w-[1220px] px-5 sm:px-8">
          <LandingSectionTitle
            title="問い合わせから予約後対応まで、ひとつの導線で管理"
            subtitle="サイト訪問者が迷うポイントを先回りして解消し、予約フォームまでの流れをデータで改善できます。"
          />
          <div className="mt-9 grid gap-5 lg:grid-cols-[0.88fr_1.55fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <div className="space-y-7">
                {LP_MANAGEMENT_STEPS.map(({ title, text, icon: Icon, tone }, index) => (
                  <div key={title} className="relative flex gap-4">
                    {index < LP_MANAGEMENT_STEPS.length - 1 && (
                      <div className="absolute left-[21px] top-11 h-[calc(100%+10px)] border-l border-dashed border-slate-300" />
                    )}
                    <div className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white ${tone}`}>
                      <Icon className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-extrabold text-slate-500">{index + 1}</span>
                        <h3 className="text-sm font-extrabold text-slate-950">{title}</h3>
                      </div>
                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {LP_FEATURES.map(({ title, text, icon: Icon, preview }) => (
                <article key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0ec] text-[#fe6147]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-950">{title}</h3>
                      <p className="mt-2 text-xs font-semibold leading-6 text-slate-600">{text}</p>
                    </div>
                  </div>
                  <div className="mt-4 min-h-[118px] rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <LandingFeaturePreview preview={preview} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="reports" className="border-b border-slate-100 bg-white py-12 sm:py-14">
        <div className="mx-auto max-w-[1220px] px-5 sm:px-8">
          <LandingSectionTitle
            title="データで現状を把握し、改善アクションへ"
            subtitle="運用レポートで成果と課題を可視化し、次にやるべきことを明確にします。"
          />
          <div className="mt-9">
            <LandingReportPanel />
          </div>
        </div>
      </section>

      <section id="workflow" className="border-b border-slate-100 bg-white py-12 sm:py-14">
        <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
          <LandingSectionTitle title="導入の流れ" />
          <div className="mt-9 grid gap-7 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
            {LP_WORKFLOW.map(({ title, text, icon: Icon }, index) => (
              <div key={title} className="contents">
                <article className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
                  <span className="absolute -left-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-sm font-extrabold text-white">
                    {index + 1}
                  </span>
                  <div className="flex items-center gap-4">
                    <Icon className="h-9 w-9 shrink-0 text-slate-600" aria-hidden="true" />
                    <div>
                      <h3 className="text-base font-extrabold text-slate-950">{title}</h3>
                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{text}</p>
                    </div>
                  </div>
                </article>
                {index < LP_WORKFLOW.length - 1 && (
                  <ChevronRight className="mx-auto hidden h-6 w-6 text-slate-400 md:block" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="bg-white px-5 py-9 sm:px-8">
        <div className="relative mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-6 overflow-hidden rounded-xl border border-[#ffe0d8] bg-[#fff5f2] px-7 py-9 text-center sm:flex-row sm:px-12 sm:text-left">
          <div
            aria-hidden="true"
            className="absolute left-7 top-7 h-20 w-20 opacity-55"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(254,97,71,0.38) 1.2px, transparent 1.2px)",
              backgroundSize: "12px 12px",
            }}
          />
          <div className="relative">
            <h2 className="text-2xl font-extrabold tracking-normal text-slate-950 sm:text-[28px]">
              迷っている見込み客を、体験予約へ
            </h2>
            <p className="mt-3 text-sm font-semibold text-slate-600">
              まずは管理画面から、今の状況をチェックしてみましょう。
            </p>
          </div>
          <div className="relative flex flex-col gap-3 sm:flex-row">
            <Link
              href={LOGIN_HREF}
              className="inline-flex min-h-[50px] items-center justify-center gap-3 rounded-lg bg-[#fe6147] px-8 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(254,97,71,0.22)] transition hover:bg-[#e94f36]"
            >
              管理画面にログイン
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={LOGIN_HREF}
              className="inline-flex min-h-[50px] items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-8 text-sm font-extrabold text-slate-950 transition hover:border-[#fe6147] hover:text-[#fe6147]"
            >
              ログイン
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <ArrowUpRight className="absolute -bottom-4 right-8 h-24 w-24 text-[#fe6147]/20" aria-hidden="true" />
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto grid max-w-[1280px] gap-8 px-5 text-sm sm:px-8 md:grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr_1.1fr]">
          <div>
            <img src="/logo.svg" alt="rizbo" width={94} height={30} className="h-7 w-auto" />
            <p className="mt-4 max-w-[260px] text-xs font-semibold leading-6 text-slate-500">
              ダンススクールの運用を、もっとシンプルに。問い合わせ対応を減らし、体験予約を増やす運用システムです。
            </p>
          </div>
          {[
            { title: "プロダクト", links: ["機能一覧", "導入の流れ", "運用レポート"] },
            { title: "サポート", links: ["ヘルプセンター", "お問い合わせ", "利用規約"] },
            { title: "会社情報", links: ["運営会社", "プライバシーポリシー"] },
          ].map((column) => (
            <div key={column.title}>
              <h3 className="text-xs font-extrabold text-slate-950">{column.title}</h3>
              <div className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <a key={link} href={LOGIN_HREF} className="block text-xs font-bold text-slate-500 hover:text-[#fe6147]">
                    {link}
                  </a>
                ))}
              </div>
            </div>
          ))}
          <div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold text-slate-500">ご不明な点はお気軽にご相談ください</p>
              <a href="mailto:support@rizbo.jp" className="mt-3 flex items-center gap-2 text-sm font-extrabold text-slate-950">
                <Mail className="h-4 w-4 text-slate-500" aria-hidden="true" />
                support@rizbo.jp
              </a>
            </div>
            <p className="mt-5 text-xs font-semibold text-slate-400">
              © 2025 rizbo. All rights reserved.
            </p>
          </div>
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
    return <LandingPageDesigned />;
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
