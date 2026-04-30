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
      <main className="min-h-screen bg-[#fffaf5] text-zinc-900 font-sans">
        <header className="sticky top-0 z-50 border-b border-orange-100 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Image src="/logo.svg" alt="ダンスル" width={120} height={32} className="h-8 w-auto" priority />
            <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-700 md:flex">
              <a href="#about" className="hover:text-orange-500">ダンスルとは</a>
              <a href="#features" className="hover:text-orange-500">機能</a>
              <a href="#pricing" className="hover:text-orange-500">料金</a>
              <a href="#faq" className="hover:text-orange-500">FAQ</a>
            </nav>
            <a href="#contact" className="rounded-full bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:opacity-90">無料で相談する</a>
          </div>
        </header>

        <section id="about" className="relative overflow-hidden px-6 pb-16 pt-16 lg:pt-24">
          <div className="absolute -right-28 top-10 h-72 w-72 rounded-full bg-orange-200/50 blur-3xl" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-bold text-orange-500">
                初期費用0円・掲載料無料・いつでも解約可能
              </div>
              <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                もっと多くの生徒さんに、
                <span className="block bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">スクールの魅力を届けよう。</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-600">
                ダンスルは、ダンススクールの集客と運営をまるごと支援する成果報酬型メディア。
                CV数の最大化と認知率向上を同時に実現し、有料プランへの切り替えにつながる土台を作ります。
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a id="contact" href="/api/auth/signin" className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-orange-400 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-orange-200">無料で相談する</a>
                <a href="#pricing" className="inline-flex items-center justify-center rounded-full border-2 border-orange-300 bg-white px-8 py-4 text-lg font-bold text-orange-500">料金プランを見る</a>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-600">
                <span>✔ 無料相談・無理な勧誘なし</span><span>✔ 30秒で問い合わせ完了</span><span>✔ 資料請求だけでもOK</span>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-2xl shadow-orange-100">
                <p className="text-sm font-bold text-orange-500">成果イメージ</p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-orange-50 p-4"><p className="text-xs text-zinc-500">月間体験申込み数</p><p className="text-3xl font-black text-orange-500">50件+</p></div>
                  <div className="rounded-2xl bg-orange-50 p-4"><p className="text-xs text-zinc-500">申込み増加実績</p><p className="text-3xl font-black text-orange-500">80%+</p></div>
                </div>
                <div className="mt-4 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-600">成果報酬型だから、無駄な固定費を抑えて導入可能。まずは無料掲載で効果を確認できます。</div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="text-center text-3xl font-black">ダンススクール経営者に選ばれる理由</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              ["CV数が増える", "検索・比較・問い合わせ導線を最適化し、体験レッスン申込みを増やします。"],
              ["認知率が向上", "エリア・ジャンルで見つけられる設計で、新規層への接点を拡大。"],
              ["成果報酬型で安心", "初期費用0円/掲載料無料で開始。成果に応じたプラン切替が可能。"],
            ].map((item) => (
              <div key={item[0]} className="rounded-3xl border border-orange-100 bg-white p-7 shadow-lg shadow-orange-50">
                <h3 className="text-xl font-bold text-orange-500">{item[0]}</h3>
                <p className="mt-3 text-zinc-600 leading-relaxed">{item[1]}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="bg-white py-16">
          <div className="mx-auto max-w-5xl rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white px-6 py-12 text-center shadow-xl shadow-orange-100">
            <h2 className="text-3xl font-black">まずは無料掲載からスタート</h2>
            <p className="mt-4 text-zinc-600">掲載料無料で効果を実感。成果が見えたタイミングで有料プランへ切り替えできます。</p>
            <a href="/api/auth/signin" className="mt-8 inline-flex rounded-full bg-gradient-to-r from-orange-500 to-orange-400 px-10 py-4 text-lg font-bold text-white">無料で相談する</a>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-center text-3xl font-black">FAQ</h2>
          <div className="mt-8 space-y-4">
            {[
              ["本当に掲載料は無料ですか？", "はい。初期導入時の掲載料は無料です。"],
              ["どんなスクールでも掲載できますか？", "ジャンル・規模問わず掲載可能です。"],
              ["有料プランの相談だけでも可能ですか？", "可能です。まずは無料相談で現状をヒアリングします。"],
            ].map((qa) => (
              <div key={qa[0]} className="rounded-2xl border border-orange-100 bg-white p-5">
                <p className="font-bold">Q. {qa[0]}</p>
                <p className="mt-2 text-zinc-600">A. {qa[1]}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
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
