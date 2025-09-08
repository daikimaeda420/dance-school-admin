// app/page.tsx — Home (Dashboard) 実装版
"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Home } from "lucide-react";
import {
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
  const user = session?.user as UserWithSchool;
  const schoolId = user?.schoolId;

  const [range, setRange] = useState<number>(7);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{
    type: "ok" | "err" | "info";
    text: string;
  } | null>(null);

  const showToast = (type: "ok" | "err" | "info", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 2400);
  };

  const fetchDashboard = useCallback(async () => {
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
    } catch (e: any) {
      showToast("err", "ダッシュボードの取得に失敗しました");
      // 最低限のフォールバック
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
  }, [schoolId, range]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const subtitle = useMemo(() => {
    if (status === "authenticated" && schoolId)
      return `ログイン中: ${schoolId}`;
    if (status === "authenticated") return "ログイン中";
    return "";
  }, [status, schoolId]);

  // 埋め込みコードコピー
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const iframeCode = `<iframe src="${baseUrl}/embed/chatbot?school=${
    schoolId ?? ""
  }" width="100%" height="600" style="border:none;"></iframe>`;
  const onCopyEmbed = () => {
    navigator.clipboard.writeText(iframeCode);
    showToast("ok", "埋め込みコードをコピーしました");
  };

  // ログCSVエクスポート（クライアント生成）
  const onExportLogs = async () => {
    try {
      const q = new URLSearchParams();
      if (schoolId) q.set("school", schoolId);
      // /api/logs に days クエリが無くてもOK（受け側で無視されるだけ）
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
    } catch (e: any) {
      showToast("err", "CSVエクスポートに失敗しました");
    }
  };

  return (
    <main className="min-h-[80vh]">
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
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 範囲切替 */}
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

            {/* 再取得 */}
            <button
              onClick={fetchDashboard}
              className="btn-ghost inline-flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              更新
            </button>

            <a
              href="/help"
              className="btn-ghost inline-flex items-center gap-1"
            >
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
          {/* クイックアクション */}
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

          {/* アラート & タスク */}
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
                  <dt className="text-gray-500 dark:text-gray-400">
                    バージョン
                  </dt>
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
    </main>
  );
}
