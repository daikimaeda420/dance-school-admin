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
                href="#functions"
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                主要機能
              </a>
              <a
                href="#cv"
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                CV改善
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
                className="rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-orange-200 hover:bg-orange-50 dark:ring-orange-900/60 dark:hover:bg-orange-950/30"
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
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-200">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                ダンススクール向け AIチャットボット / ダンス診断 / CV改善
              </div>

              <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
                問い合わせ対応を自動化し
                <br />
                体験予約のCVを伸ばす
                <br />
                オールインワン運用
              </h1>

              <p className="mt-4 max-w-xl text-base text-zinc-600 dark:text-zinc-300">
                よくある質問はチャットで即解決。迷うユーザーは「ダンス診断」でおすすめに誘導。
                さらにログ分析で、離脱ポイントと“刺さる質問”を見える化して改善できます。
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/api/auth/signin"
                  className="inline-flex items-center justify-center rounded-2xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-700"
                >
                  ログインして試す
                </Link>
                <a
                  href="#functions"
                  className="inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold ring-1 ring-orange-200 hover:bg-orange-50 dark:ring-orange-900/60 dark:hover:bg-orange-950/30"
                >
                  主要機能を見る
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 dark:border-orange-900/60 dark:bg-orange-950/30">
                  script埋め込み
                </span>
                <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 dark:border-orange-900/60 dark:bg-orange-950/30">
                  分岐FAQ/診断
                </span>
                <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 dark:border-orange-900/60 dark:bg-orange-950/30">
                  ログ→改善
                </span>
                <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 dark:border-orange-900/60 dark:bg-orange-950/30">
                  school別運用
                </span>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <MiniStat
                  label="導入"
                  value="最短10分"
                  note="script貼り付けで表示"
                />
                <MiniStat
                  label="自動化"
                  value="FAQ/診断"
                  note="分岐で迷いを解消"
                />
                <MiniStat label="改善" value="ログ分析" note="CV導線を最適化" />
              </div>
            </div>

            <div className="rounded-3xl border border-orange-200 bg-gradient-to-b from-orange-50 to-white p-4 shadow-sm dark:border-orange-900/60 dark:from-orange-950/20 dark:to-zinc-950">
              <div className="overflow-hidden rounded-2xl border border-orange-200 bg-white dark:border-orange-900/60 dark:bg-zinc-950">
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
            問い合わせ対応・予約導線で、こんな課題ありませんか？
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <LPProblem
              title="問い合わせ対応に追われる"
              desc="体験/料金/持ち物/予約/年齢制限など、同じ質問対応が積み上がり、現場が疲弊。"
            />
            <LPProblem
              title="迷って離脱（CVが伸びない）"
              desc="ジャンル・目的・レベルが決められないユーザーは、比較中に離脱しがち。"
            />
            <LPProblem
              title="改善したいが“根拠”がない"
              desc="どの質問が多い？どこで離脱？が見えないため、LPや導線改善が当て勘になる。"
            />
          </div>
        </section>

        {/* Solution */}
        <section id="solution" className="mx-auto w-full max-w-6xl px-6 pb-14">
          <div className="rounded-3xl border border-orange-200 bg-gradient-to-b from-orange-50 to-white p-8 shadow-sm dark:border-orange-900/60 dark:from-orange-950/20 dark:to-zinc-950">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              Rizboなら「自動化」＋「診断」＋「改善」で解決
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <LPSolution
                title="AIチャットで一次対応を自動化"
                desc="営業時間外も即回答。料金/体験/アクセス/持ち物などを自動応答し、スタッフ稼働を削減。"
              />
              <LPSolution
                title="ダンス診断で“迷い”を解消"
                desc="目的・年齢・経験・好きなジャンルから最適なクラスへ誘導。迷い→予約へつなげます。"
              />
              <LPSolution
                title="ログ分析でCV導線を改善"
                desc="よく押される質問・未解決の相談・離脱ポイントを把握。改善の打ち手が明確になります。"
              />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/api/auth/signin"
                className="inline-flex items-center justify-center rounded-2xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-700"
              >
                ログインして始める
              </Link>
              <a
                href="#functions"
                className="inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold ring-1 ring-orange-200 hover:bg-orange-50 dark:ring-orange-900/60 dark:hover:bg-orange-950/30"
              >
                主要機能を見る
              </a>
            </div>
          </div>
        </section>

        {/* Functions */}
        <section id="functions" className="mx-auto w-full max-w-6xl px-6 pb-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-orange-600 dark:text-orange-300">
                FEATURES
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                チャットボット × ダンス診断 × 運用改善
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
                「答える」だけでなく、「選ばせる」「予約に導く」「改善する」まで一気通貫。
                ダンススクールのCV導線に特化した運用を想定しています。
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <FeatureGroup
              kicker="CHATBOT"
              title="AIチャットボット機能"
              items={[
                {
                  title: "FAQ/分岐（選択肢）で迷わせない",
                  desc: "質問→回答に加えて、選択肢→次の質問（ツリー）で案内を最短化。",
                },
                {
                  title: "URL誘導で予約ページへスムーズ導線",
                  desc: "「体験申込」「料金表」「アクセス」など、該当ページへ自然に誘導。",
                },
                {
                  title: "埋め込みが簡単（script）",
                  desc: "サイトにタグを貼るだけ。テーマ/パレット/表示位置も属性で調整可能。",
                },
              ]}
            />

            <FeatureGroup
              kicker="DIAGNOSIS"
              title="ダンス診断機能"
              items={[
                {
                  title: "目的・経験・年代からおすすめ提案",
                  desc: "初心者/経験者、運動不足解消、K-POP/ヒップホップなどで最適化。",
                },
                {
                  title: "診断結果から“次の行動”へ誘導",
                  desc: "おすすめクラス・校舎・体験導線へ。迷いを減らしてCVにつなげます。",
                },
                {
                  title: "診断編集を管理画面で完結",
                  desc: "質問/選択肢/遷移先URLを編集して運用改善。季節キャンペーンにも対応。",
                },
              ]}
            />

            <FeatureGroup
              kicker="CONVERSION"
              title="コンバージョン改善"
              items={[
                {
                  title: "ログで“よくある質問”と未解決を把握",
                  desc: "どの質問が多いか、どこで止まるかを可視化。FAQ改善の根拠に。",
                },
                {
                  title: "CSV出力で分析ツール連携",
                  desc: "Looker Studio/スプレッドシート/BIへ。施策の検証が回しやすい。",
                },
                {
                  title: "導線改善の打ち手が明確になる",
                  desc: "離脱箇所に合わせてLP/CTA/文言/診断分岐を改善し、CVR向上を狙えます。",
                },
              ]}
            />
          </div>
        </section>

        {/* CV */}
        <section id="cv" className="mx-auto w-full max-w-6xl px-6 pb-14">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-3xl border border-orange-200 bg-white p-7 shadow-sm dark:border-orange-900/60 dark:bg-zinc-950">
              <p className="text-sm font-semibold text-orange-600 dark:text-orange-300">
                HOW IT IMPROVES CV
              </p>
              <h3 className="mt-2 text-lg font-bold tracking-tight sm:text-xl">
                “迷い”を減らし、予約までの距離を短くする
              </h3>
              <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                ダンススクールのCVが伸びない原因は「情報不足」よりも「選べない」ことが多いです。
                Rizboはチャットで疑問を解消し、診断で選択を補助し、ログで改善を回せる設計です。
              </p>

              <div className="mt-6 space-y-3">
                <FlowRow
                  left="ユーザー"
                  right="チャットで質問（不安解消）"
                  accent
                />
                <FlowRow
                  left="Rizbo"
                  right="診断でおすすめ提示（迷い解消）"
                  accent
                />
                <FlowRow left="ユーザー" right="体験申込へ遷移（CV）" accent />
                <FlowRow left="管理者" right="ログで改善（次回CV↑）" accent />
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold ring-1 ring-orange-200 hover:bg-orange-50 dark:ring-orange-900/60 dark:hover:bg-orange-950/30"
                >
                  相談する
                </a>
                <Link
                  href="/api/auth/signin"
                  className="inline-flex items-center justify-center rounded-2xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-700"
                >
                  ログインして確認
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-orange-200 bg-gradient-to-b from-orange-50 to-white p-7 shadow-sm dark:border-orange-900/60 dark:from-orange-950/20 dark:to-zinc-950">
              <div className="text-sm font-semibold">
                改善に使える“ログ”の例
              </div>
              <div className="mt-4 grid gap-3">
                <InsightRow
                  title="よく押される質問"
                  desc="料金・体験・持ち物・年齢制限など"
                />
                <InsightRow
                  title="未解決の相談"
                  desc="校舎の空き/ジャンル迷い/レベル不安"
                />
                <InsightRow
                  title="誘導先URLの反応"
                  desc="予約ページへ遷移した質問を特定"
                />
                <InsightRow
                  title="CSVで分析"
                  desc="期間ごとの傾向を可視化して施策に反映"
                />
              </div>
              <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                ※ログは管理画面で確認 / CSV出力できます
              </p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="mx-auto w-full max-w-6xl px-6 pb-16">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            お気軽にご相談ください
          </h2>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <ContactBox
              title="まずは管理画面・機能を確認したい"
              desc="チャットボット/診断/ログ改善の流れを、実際の管理画面で確認できます。"
              cta="ログインして確認"
              href="/api/auth/signin"
              primary
            />
            <ContactBox
              title="導入やCV改善の相談がしたい"
              desc="現状の導線・問い合わせ内容を踏まえて、運用設計（診断設計/FAQ設計）をご提案します。"
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

      {/* クイックアクション & セットアップ */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            <h2 className="text-base font-semibold">クイックアクション</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/faq"
              className="btn-ghost inline-flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" /> Q&A編集{" "}
              <ArrowUpRight className="h-4 w-4 opacity-60" />
            </a>

            <a
              href={`/admin/diagnosis/campuses${
                schoolId
                  ? `?schoolId=${encodeURIComponent(schoolId)}`
                  : ""
              }`}
              className="btn-ghost inline-flex items-center gap-2"
            >
              <ClipboardList className="h-4 w-4" /> 診断編集{" "}
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

/* =========================
   LP Parts (Fix: add missing components)
========================= */

function MiniStat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm dark:border-orange-900/60 dark:bg-zinc-950">
      <div className="text-xs font-semibold text-orange-700 dark:text-orange-200">
        {label}
      </div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
        {note}
      </div>
    </div>
  );
}

function FeatureGroup({
  kicker,
  title,
  items,
}: {
  kicker: string;
  title: string;
  items: { title: string; desc: string }[];
}) {
  return (
    <div className="rounded-3xl border border-orange-200 bg-white p-6 shadow-sm dark:border-orange-900/60 dark:bg-zinc-950">
      <div className="text-xs font-semibold text-orange-600 dark:text-orange-300">
        {kicker}
      </div>
      <div className="mt-2 text-base font-semibold">{title}</div>

      <div className="mt-4 space-y-4">
        {items.map((it, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-orange-200/60 bg-orange-50/40 p-4 dark:border-orange-900/40 dark:bg-orange-950/20"
          >
            <div className="text-sm font-semibold">{it.title}</div>
            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              {it.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightRow({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-orange-900/60 dark:bg-zinc-950">
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-zinc-600 dark:text-zinc-300">{desc}</div>
    </div>
  );
}

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

function FlowRow({
  left,
  right,
  accent,
}: {
  left: string;
  right: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm " +
        (accent
          ? "border-orange-200 bg-orange-50 dark:border-orange-900/60 dark:bg-orange-950/20"
          : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50")
      }
    >
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
  primary,
}: {
  title: string;
  desc: string;
  cta: string;
  href: string;
  primary?: boolean;
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
          className={
            "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition " +
            (primary
              ? "bg-orange-600 text-white hover:bg-orange-700"
              : "ring-1 ring-orange-200 hover:bg-orange-50 dark:ring-orange-900/60 dark:hover:bg-orange-950/30")
          }
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}
