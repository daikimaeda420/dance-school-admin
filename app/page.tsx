// app/page.tsx — Home (未ログインLP + ログイン後Dashboard / NURO風LP)
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
  PlusCircle,
  Rocket,
  RefreshCw,
  Copy,
} from "lucide-react";

type UserWithSchool = {
  name?: string;
  email?: string;
  image?: string;
  schoolId?: string;
};

type KPI = { label: string; value: string; delta?: string; note?: string };
type Activity = { time: string; text: string };
type Task = {
  kind: "warn" | "error" | "info";
  title: string;
  count?: number;
  href?: string;
};
type SystemInfo = { version: string; env: string; lastBackup: string };

type DashboardResponse = {
  kpis: KPI[];
  activities: Activity[];
  tasks: Task[];
  system: SystemInfo | null;
};

const RANGES = [
  { key: 7, label: "直近7日" },
  { key: 14, label: "直近14日" },
  { key: 30, label: "直近30日" },
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const user = session?.user as UserWithSchool | undefined;
  const schoolId = user?.schoolId;

  const [range, setRange] = useState<number>(7);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(false);

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
      setKpis(data.kpis ?? []);
      setActivities(data.activities ?? []);
      setTasks(data.tasks ?? []);
      setSystem(data.system ?? null);
    } catch {
      showToast("err", "ダッシュボードの取得に失敗しました");
      setKpis([]);
      setActivities([]);
      setTasks([]);
      setSystem({
        version: "v0.1.0",
        env: process.env.NODE_ENV ?? "development",
        lastBackup: "-",
      });
    } finally {
      setLoading(false);
    }
  }, [schoolId, range, status]);

  useEffect(() => {
    if (status === "authenticated") fetchDashboard();
  }, [fetchDashboard, status]);

  const subtitle = useMemo(() => {
    if (status === "authenticated" && schoolId)
      return `ログイン中: ${schoolId}`;
    if (status === "authenticated") return "ログイン中";
    return "";
  }, [status, schoolId]);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const iframeCode = `<iframe src="${baseUrl}/embed/chatbot?school=${
    schoolId ?? ""
  }" width="100%" height="600" style="border:none;"></iframe>`;

  const onCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(iframeCode);
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
  // 未ログインLP（NURO風）
  // ==========================
  if (status === "unauthenticated") {
    return (
      <main className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-zinc-200/60 bg-white/80 backdrop-blur dark:border-zinc-800/60 dark:bg-zinc-950/70">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.svg"
                alt="rizbo"
                width={120}
                height={32}
                priority
                className="h-8 w-auto dark:invert"
              />
            </div>

            <nav className="hidden items-center gap-5 text-sm text-zinc-600 dark:text-zinc-300 sm:flex">
              <a
                href="#issues"
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                課題
              </a>
              <a
                href="#solution"
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                解決
              </a>
              <a
                href="#about"
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                サービス概要
              </a>
              <a
                href="#functions"
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                主要機能
              </a>
              <a
                href="#contact"
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                お問い合わせ
              </a>
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href="/api/auth/signin"
                className="rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-zinc-200 hover:bg-zinc-50 dark:ring-zinc-800 dark:hover:bg-zinc-900"
              >
                ログイン
              </Link>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-6 pt-12">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                ダンススクール向け AIチャットボット / FAQ / 診断
              </p>
              <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
                AI活用で
                <br />
                問い合わせ対応時間を
                <br />
                大幅削減
              </h1>
              <p className="mt-4 max-w-xl text-base text-zinc-600 dark:text-zinc-300">
                すぐに使えるテンプレートと、分岐（診断）＋ナレッジ運用で
                「よくある質問」を自動化。埋め込みでサイトに簡単導入できます。
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/api/auth/signin"
                  className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-950"
                >
                  ログインして使う
                </Link>
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold ring-1 ring-zinc-200 hover:bg-zinc-50 dark:ring-zinc-800 dark:hover:bg-zinc-900"
                >
                  お問い合わせ
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                <span className="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-800">
                  埋め込み（script）
                </span>
                <span className="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-800">
                  分岐FAQ/診断
                </span>
                <span className="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-800">
                  ログで改善
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white p-4 shadow-sm dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                <Image
                  src="/lp/mockup.png"
                  alt="Rizbo 管理画面モックアップ"
                  width={1200}
                  height={800}
                  priority
                  className="h-auto w-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Issues */}
        <section id="issues" className="mx-auto w-full max-w-6xl px-6 py-14">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            問い合わせ対応にお悩みはありませんか？
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <LPProblem
              title="問い合わせ対応に追われてしまう"
              desc="体験/料金/持ち物/予約などの対応が増えると、本来の業務が圧迫されます。"
            />
            <LPProblem
              title="何度も同じ質問がくる"
              desc="FAQが整備されていないと、同じ質問が繰り返され、対応品質もブレがちです。"
            />
            <LPProblem
              title="導入したいのに時間が取れない"
              desc="チャットボットやAIを入れたくても、初期データ作成や運用設計が負担になります。"
            />
          </div>
        </section>

        {/* Solution */}
        <section id="solution" className="mx-auto w-full max-w-6xl px-6 pb-14">
          <div className="rounded-3xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white p-8 shadow-sm dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              そのお悩み、Rizboで解決
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <LPSolution
                title="AIが問い合わせ対応"
                desc="よくある質問は自動応答。スタッフ対応の工数を大幅削減。"
              />
              <LPSolution
                title="質問をナレッジ化"
                desc="人が対応したやりとりをFAQとして蓄積し、次回から自動化。"
              />
              <LPSolution
                title="最少工数で立ち上げ"
                desc="テンプレート＋分岐設計で、学習期間なしに運用を開始できます。"
              />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/api/auth/signin"
                className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-950"
              >
                ログインして始める
              </Link>
              <a
                href="#functions"
                className="inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold ring-1 ring-zinc-200 hover:bg-zinc-50 dark:ring-zinc-800 dark:hover:bg-zinc-900"
              >
                主要機能を見る
              </a>
            </div>
          </div>
        </section>

        {/* About */}
        <section id="about" className="mx-auto w-full max-w-6xl px-6 pb-14">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                ABOUT
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                Rizboとは
              </h2>
              <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                Rizboは、テンプレートと効率的な運用導線を備えた
                ダンススクール向けAIチャットボットです。
                サイト埋め込みで「体験予約」や「よくある質問」対応を自動化し、
                ログを見ながら継続的に改善できます。
              </p>

              <div className="mt-6 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                <div className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-zinc-400" />
                  <span>テナント（school）ごとにFAQ/診断を切替</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-zinc-400" />
                  <span>テーマ・パレット・位置などを埋め込み属性で制御</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-zinc-400" />
                  <span>Q&A編集とログ確認を管理画面で完結</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-semibold">運用フロー（例）</div>
              <div className="mt-4 space-y-3">
                <FlowRow left="従業員/ユーザー" right="チャットで質問" />
                <FlowRow left="Rizbo" right="自動回答（FAQ/診断）" />
                <FlowRow left="管理者" right="未解決のみ対応 → FAQ化" />
                <FlowRow left="Rizbo" right="次回から自動回答" />
              </div>
              <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                ※図や画像に差し替え可能（PNG/SVG推奨）
              </p>
            </div>
          </div>
        </section>

        {/* Functions */}
        <section id="functions" className="mx-auto w-full max-w-6xl px-6 pb-14">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            ユーザーと管理者 それぞれに便利な機能
          </h2>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            {/* User */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                ユーザー向け機能
              </p>
              <div className="mt-4 space-y-4">
                <FeatureCard
                  title="AIチャット（分岐対応）"
                  desc="質問に対して、対話形式で自動応答。必要に応じてURL誘導も可能。"
                />
                <FeatureCard
                  title="スムーズなエスカレーション設計"
                  desc="チャットで解決しない場合は、問い合わせ導線へ自然に誘導（LP/フォーム/LINEなど）。"
                />
              </div>
            </div>

            {/* Admin */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                管理者向け機能
              </p>
              <div className="mt-4 space-y-4">
                <FeatureCard
                  title="Q&A/診断編集（管理画面）"
                  desc="質問→回答、選択肢→次の質問のツリーを編集。公開/運用を高速化。"
                />
                <FeatureCard
                  title="ログ確認・CSV出力"
                  desc="よく押される質問を把握して改善。必要ならCSVで分析ツールへ連携。"
                />
                <FeatureCard
                  title="テナント切替・権限運用"
                  desc="school単位でデータを管理し、運用を分離。"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="mx-auto w-full max-w-6xl px-6 pb-16">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            ご不明な点はお気軽にお問い合わせください
          </h2>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <ContactBox
              title="まずは機能について詳しく知りたい"
              desc="管理画面・埋め込み・運用フローなどを確認したい方はこちら。"
              cta="ログインして確認"
              href="/api/auth/signin"
            />
            <ContactBox
              title="料金プランや詳細を聞きたい"
              desc="導入方法・運用設計・要件整理など、相談したい方はこちら。"
              cta="お問い合わせ（仮）"
              href="/help"
            />
          </div>

          <footer className="mt-10 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            © {new Date().getFullYear()} Rizbo
          </footer>
        </section>
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
  // ログイン後Dashboard（既存のまま）
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
            {subtitle || "Q&A運用状況のハイライトとクイックアクション"}
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
            onClick={fetchDashboard}
            className="btn-ghost inline-flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            更新
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

      {/* ローディング */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="mt-3 h-7 w-20 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="mt-2 h-3 w-40 rounded bg-gray-100 dark:bg-gray-900" />
            </div>
          ))}
        </div>
      )}

      {/* KPI */}
      {!loading && !!kpis.length && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k, i) => (
            <div key={i} className="card p-5">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {k.label}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="text-3xl font-semibold tracking-tight">
                  {k.value}
                </div>
                {k.delta && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-700">
                    {k.delta}
                  </span>
                )}
              </div>
              {k.note && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {k.note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* クイックアクション & タスク */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            <h2 className="text-base font-semibold">クイックアクション</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/faq/new"
              className="btn-ghost inline-flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" /> 新しいQ&Aを追加{" "}
              <ArrowUpRight className="h-4 w-4 opacity-60" />
            </a>

            <a
              href="/faq?draft=1"
              className="btn-ghost inline-flex items-center gap-2"
            >
              <ClipboardList className="h-4 w-4" /> ドラフトを公開{" "}
              <ArrowUpRight className="h-4 w-4 opacity-60" />
            </a>

            <button
              onClick={onCopyEmbed}
              className="btn-ghost inline-flex items-center gap-2"
              disabled={!schoolId}
              title={!schoolId ? "schoolId が必要です" : undefined}
            >
              <Copy className="h-4 w-4" /> 埋め込みコードをコピー
            </button>

            <button
              onClick={onExportLogs}
              className="btn-ghost inline-flex items-center gap-2"
            >
              <FileDown className="h-4 w-4" /> ログCSVをエクスポート（{range}
              日）
            </button>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <h2 className="text-base font-semibold">アラート & タスク</h2>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              特にありません
            </p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((t, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between gap-2"
                >
                  <a href={t.href ?? "#"} className="text-sm hover:underline">
                    {t.title}
                  </a>
                  {typeof t.count === "number" ? (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        t.kind === "error"
                          ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-700"
                          : t.kind === "warn"
                          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-100 dark:border-amber-700"
                          : "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/60 dark:text-gray-200 dark:border-gray-700"
                      }`}
                    >
                      {t.count}
                    </span>
                  ) : (
                    <CheckCircle2 className="h-4 w-4 opacity-60" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* アクティビティ & システム */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            <h2 className="text-base font-semibold">最近のアクティビティ</h2>
          </div>
          {activities.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              対象期間のアクティビティはありません
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {activities.map((a, i) => (
                <li
                  key={i}
                  className="py-2 text-sm flex items-center justify-between"
                >
                  <span className="text-gray-500 dark:text-gray-400 w-40 shrink-0">
                    {a.time}
                  </span>
                  <span className="ml-3">{a.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
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
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">
                  最終バックアップ
                </dt>
                <dd>{system.lastBackup}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              情報の取得に失敗しました。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== LP Parts ===== */

function LPProblem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        {desc}
      </div>
    </div>
  );
}

function LPSolution({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        {desc}
      </div>
    </div>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        {desc}
      </div>
    </div>
  );
}

function FlowRow({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <span className="text-zinc-600 dark:text-zinc-300">{left}</span>
      <span className="font-semibold">{right}</span>
    </div>
  );
}

function ContactBox({
  title,
  desc,
  cta,
  href,
}: {
  title: string;
  desc: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-base font-semibold">{title}</div>
      <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        {desc}
      </div>
      <div className="mt-5">
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-950"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}
