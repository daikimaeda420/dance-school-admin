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
  MessageSquare,
  Sparkles,
  BarChart3,
  MousePointerClick,
  Layers,
  Settings,
  Mail,
  MapPin,
  ChevronRight,
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

type DashboardResponse = {
  kpis: KPI[];
  setup: SetupItem[];
  activities: Activity[];
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
  const [setup, setSetup] = useState<SetupItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
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
      setSetup(data.setup ?? []);
      setActivities(data.activities ?? []);
      setSystem(data.system ?? null);
    } catch {
      showToast("err", "ダッシュボードの取得に失敗しました");
      setKpis([]);
      setSetup([]);
      setActivities([]);
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
  // 未ログインLP（モダンSaaS）
  // ==========================
  if (status === "unauthenticated") {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-zinc-100 selection:bg-orange-500/30 font-sans">
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
          {/* Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-orange-600/20 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute top-40 left-1/4 w-[400px] h-[400px] bg-amber-600/20 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="relative mx-auto max-w-7xl px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-300 backdrop-blur-md mb-8">
              <Sparkles className="h-4 w-4" />
              <span>ダンススクール運営の次世代プラットフォーム</span>
            </div>
            
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.15]">
              問い合わせ対応をゼロに。
              <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 mt-2 inline-block">
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

        {/* Bento Grid Features */}
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
            {/* Chatbot (Large) */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 p-8 transition-all hover:bg-zinc-900/80 md:col-span-2">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/10 blur-[80px] transition-all group-hover:bg-orange-500/20" />
              <div className="relative z-10">
                <div className="mb-4 inline-flex rounded-xl bg-orange-500/20 p-3 text-orange-300 ring-1 ring-orange-500/30">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">AIチャットボット</h3>
                <p className="text-zinc-400 max-w-md leading-relaxed">
                  24時間365日、Webサイト上の疑問を自動で解決。料金やアクセス、持ち物などのよくある質問をツリー構造でご案内し、スクールへの問い合わせ対応コストを大幅に削減します。<br />
                  <span className="text-orange-300 mt-3 inline-flex items-center gap-1 text-sm font-medium bg-orange-500/10 px-3 py-1 rounded-full"><CheckCircle2 className="h-4 w-4"/> 管理画面からスクリプト発行</span>
                </p>
              </div>
            </div>

            {/* Diagnosis (Tall) */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 p-8 transition-all hover:bg-zinc-900/80 md:row-span-2 flex flex-col">
              <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-amber-500/10 blur-[80px] transition-all group-hover:bg-amber-500/20" />
              <div className="relative z-10 h-full flex flex-col flex-1">
                <div className="mb-4 inline-flex rounded-xl bg-amber-500/20 p-3 text-amber-300 ring-1 ring-amber-500/30 w-fit">
                  <MousePointerClick className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">パーソナライズ診断</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                  「どのクラスが合っているか分からない」という離脱の最大の原因を解消。年齢、目的、ダンス経験をヒアリングし、最適なクラスやインストラクターをピンポイントで提案します。結果画面からそのまま体験予約へ誘導し、コンバージョン率を劇的に引き上げます。
                </p>
                <div className="mt-auto p-5 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
                  <div className="text-xs font-semibold text-white mb-4 tracking-wider">DIAGNOSIS FLOW</div>
                  <div className="space-y-4 pb-1">
                    <div className="flex items-center gap-3 text-sm text-zinc-300 font-medium">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 shadow-inner">1</div>
                      年齢・ライフスタイル
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-300 font-medium">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 shadow-inner">2</div>
                      ダンスの経験・レベル
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-300 font-medium">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 shadow-inner">3</div>
                      一番の目的・お悩み
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 p-8 transition-all hover:bg-zinc-900/80">
              <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-rose-500/10 blur-[60px] transition-all group-hover:bg-rose-500/20" />
              <div className="relative z-10">
                <div className="mb-4 inline-flex rounded-xl bg-rose-500/20 p-3 text-rose-300 ring-1 ring-rose-500/30">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">分析ダッシュボード</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  ユーザーがどこで迷っているか、どの質問が多くクリックされているかを可視化。効果測定とCVR改善のPDCAを根拠を持って回せます。
                </p>
              </div>
            </div>

            {/* Forms & Automation */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 p-8 transition-all hover:bg-zinc-900/80">
              <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-yellow-500/10 blur-[60px] transition-all group-hover:bg-yellow-500/20" />
              <div className="relative z-10">
                <div className="mb-4 inline-flex rounded-xl bg-yellow-500/20 p-3 text-yellow-300 ring-1 ring-yellow-500/30">
                  <Mail className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">フォーム & 自動化</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  システム内蔵の予約連携機能。予約完了時の自動サンクスメール送信や、管理者への即時通知で対応の漏れや遅れを完全に防ぎます。
                </p>
              </div>
            </div>
            
            {/* Multi-School */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 p-8 transition-all hover:bg-zinc-900/80 md:col-span-2 lg:col-span-3 flex flex-col md:flex-row md:items-center gap-8">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 md:w-1/2">
                <div className="mb-4 inline-flex rounded-xl bg-orange-500/20 p-3 text-orange-300 ring-1 ring-orange-500/30">
                  <MapPin className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">多店舗・マルチ連携対応</h3>
                <p className="text-zinc-400 leading-relaxed text-sm">
                  複数校舎の管理も1つのプラットフォームで完結。校舎ごとのGoogleマップ表示、アクセス案内、独自スケジュールの設定が可能です。ビジネスの成長に合わせて柔軟に拡張できるスケーラブルな設計です。
                </p>
              </div>
              <div className="relative z-10 md:w-1/2">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10">
                     <Layers className="h-5 w-5 text-orange-400 mb-3" />
                     <div className="font-semibold text-white">一元管理ダッシュボード</div>
                     <div className="text-xs text-zinc-500 mt-1.5 leading-relaxed">全校舎の設定とログを1つのアカウントから安全に管理。</div>
                   </div>
                   <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10">
                     <Settings className="h-5 w-5 text-orange-400 mb-3" />
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
          <div className="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-orange-900/10 px-8 py-16 backdrop-blur-sm sm:px-16 sm:py-20 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 to-transparent opacity-50" />
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

        {/* Footer */}
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

      {/* セットアップ状況 */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-1">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <h2 className="text-base font-semibold">セットアップ状況</h2>
          </div>
          {setup.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              読み込み中…
            </p>
          ) : (
            <ul className="space-y-2">
              {setup.map((s, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between gap-2"
                >
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
      </div>

      {/* アクティビティ & システム */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            <h2 className="text-base font-semibold">最近のチャットログ</h2>
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
