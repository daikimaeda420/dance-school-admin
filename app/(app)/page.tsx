// app/(app)/page.tsx — Home (未ログインLP + ログイン後 統合ダッシュボード)
"use client";

import Image from "next/image";
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
  Sparkles,
  BarChart3,
  MousePointerClick,
  Layers,
  Settings,
  Mail,
  MapPin,
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

type DropoffStep = {
  stepKey: string;
  label: string;
  count: number;
  prevCount: number;
  retentionRate: number | null;
  dropoffRate: number | null;
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
};

const RANGES = [
  { key: 7, label: "直近7日" },
  { key: 14, label: "直近14日" },
  { key: 30, label: "直近30日" },
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
    }
  }, [fetchDashboard, fetchDropoff, status]);

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
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-zinc-100 selection:bg-indigo-500/30 font-sans">
        {/* Header */}
        <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-black/20 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logo_w.svg"
                alt="rizbo"
                width={100}
                height={28}
                priority
                className="h-7 w-auto opacity-90 hover:opacity-100 transition-opacity"
              />
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/api/auth/signin"
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/20 border border-white/10"
              >
                <span>ログイン</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="relative overflow-hidden pt-36 pb-20 lg:pt-48 lg:pb-32">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute top-40 left-1/4 w-[400px] h-[400px] bg-purple-600/20 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative mx-auto max-w-7xl px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300 backdrop-blur-md mb-8">
              <Sparkles className="h-4 w-4" />
              <span>ダンススクール運営の次世代プラットフォーム</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.15]">
              問い合わせ対応をゼロに。
              <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mt-2 inline-block">
                体験予約のCVを最大化する。
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 leading-relaxed">
              AIチャットボットによる自動応答、最適なクラスへ導くダンス診断、
              そしてそれらの効果を分析するダッシュボードまで。スクールの体験予約への導線を最適化するオールインワンシステムです。
            </p>

            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/api/auth/signin"
                className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-bold text-zinc-950 transition-transform hover:scale-105 hover:bg-zinc-100"
              >
                システムにログインする
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-md transition-colors hover:bg-white/10"
              >
                機能を詳しく見る
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="relative mx-auto max-w-7xl px-6 py-20 z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              スクール運営を加速させる強力な機能
            </h2>
            <p className="mt-4 text-zinc-400">
              顧客の迷いをなくし、予約アクションへ直結させる設計。
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 p-8 transition-all hover:bg-zinc-900/80 md:col-span-2">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[80px] transition-all group-hover:bg-indigo-500/20" />
              <div className="relative z-10">
                <div className="mb-4 inline-flex rounded-xl bg-indigo-500/20 p-3 text-indigo-300 ring-1 ring-indigo-500/30">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">AIチャットボット</h3>
                <p className="text-zinc-400 max-w-md leading-relaxed">
                  24時間365日、Webサイト上の疑問を自動で解決。料金やアクセス、持ち物などのよくある質問をツリー構造でご案内し、スクールへの問い合わせ対応コストを大幅に削減します。
                  <span className="text-indigo-300 mt-3 inline-flex items-center gap-1 text-sm font-medium bg-indigo-500/10 px-3 py-1 rounded-full"><CheckCircle2 className="h-4 w-4"/> 管理画面からスクリプト発行</span>
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 p-8 transition-all hover:bg-zinc-900/80 md:row-span-2 flex flex-col">
              <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-purple-500/10 blur-[80px] transition-all group-hover:bg-purple-500/20" />
              <div className="relative z-10 h-full flex flex-col flex-1">
                <div className="mb-4 inline-flex rounded-xl bg-purple-500/20 p-3 text-purple-300 ring-1 ring-purple-500/30 w-fit">
                  <MousePointerClick className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">パーソナライズ診断</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                  「どのクラスが合っているか分からない」という離脱の最大の原因を解消。年齢、目的、ダンス経験をヒアリングし、最適なクラスやインストラクターをピンポイントで提案します。
                </p>
                <div className="mt-auto p-5 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
                  <div className="text-xs font-semibold text-white mb-4 tracking-wider">DIAGNOSIS FLOW</div>
                  <div className="space-y-4 pb-1">
                    {["年齢・ライフスタイル", "ダンスの経験・レベル", "一番の目的・お悩み"].map((label, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-zinc-300 font-medium">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30 shadow-inner">{i + 1}</div>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 p-8 transition-all hover:bg-zinc-900/80">
              <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-pink-500/10 blur-[60px] transition-all group-hover:bg-pink-500/20" />
              <div className="relative z-10">
                <div className="mb-4 inline-flex rounded-xl bg-pink-500/20 p-3 text-pink-300 ring-1 ring-pink-500/30">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">分析ダッシュボード</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  ユーザーがどこで迷っているか、どの質問が多くクリックされているかを可視化。効果測定とCVR改善のPDCAを根拠を持って回せます。
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 p-8 transition-all hover:bg-zinc-900/80">
              <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-[60px] transition-all group-hover:bg-emerald-500/20" />
              <div className="relative z-10">
                <div className="mb-4 inline-flex rounded-xl bg-emerald-500/20 p-3 text-emerald-300 ring-1 ring-emerald-500/30">
                  <Mail className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">フォーム & 自動化</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  システム内蔵の予約連携機能。予約完了時の自動サンクスメール送信や、管理者への即時通知で対応の漏れや遅れを完全に防ぎます。
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 p-8 transition-all hover:bg-zinc-900/80 md:col-span-2 lg:col-span-3 flex flex-col md:flex-row md:items-center gap-8">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 md:w-1/2">
                <div className="mb-4 inline-flex rounded-xl bg-blue-500/20 p-3 text-blue-300 ring-1 ring-blue-500/30">
                  <MapPin className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">多店舗・マルチ連携対応</h3>
                <p className="text-zinc-400 leading-relaxed text-sm">
                  複数校舎の管理も1つのプラットフォームで完結。校舎ごとのGoogleマップ表示、アクセス案内、独自スケジュールの設定が可能です。
                </p>
              </div>
              <div className="relative z-10 md:w-1/2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10">
                    <Layers className="h-5 w-5 text-blue-400 mb-3" />
                    <div className="font-semibold text-white">一元管理ダッシュボード</div>
                    <div className="text-xs text-zinc-500 mt-1.5 leading-relaxed">全校舎の設定とログを1つのアカウントから安全に管理。</div>
                  </div>
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10">
                    <Settings className="h-5 w-5 text-blue-400 mb-3" />
                    <div className="font-semibold text-white">柔軟なカスタマイズ</div>
                    <div className="text-xs text-zinc-500 mt-1.5 leading-relaxed">校舎ごとのテーマカラーや出力項目の出し分けに対応。</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative mx-auto mt-10 max-w-5xl px-6 pb-32 text-center z-10">
          <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-indigo-900/10 px-8 py-16 backdrop-blur-sm sm:px-16 sm:py-20 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent opacity-50" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold tracking-tight text-white mb-6">
                次世代のスクール運営を、今すぐあなたのサイトに。
              </h2>
              <p className="mx-auto max-w-xl text-zinc-400 mb-10 leading-relaxed">
                1行のスクリプトをWebサイトに埋め込むだけで、すべての機能が稼働し始めます。
              </p>
              <Link
                href="/api/auth/signin"
                className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-bold text-zinc-950 transition-transform hover:scale-105"
              >
                システムにログインする
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 bg-black/40 text-center py-8">
          <p className="text-sm text-zinc-600">
            © {new Date().getFullYear()} Rizbo Admin System. All rights reserved.
          </p>
        </footer>
      </main>
    );
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
            onClick={() => { fetchDashboard(); fetchDropoff(); }}
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
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                直近 {range}日間 / 診断開始セッション数: {dropoff.totalSessions.toLocaleString()}
              </p>
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
