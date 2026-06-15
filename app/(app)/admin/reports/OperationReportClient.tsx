"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Loader2,
  MessagesSquare,
  MousePointerClick,
  RefreshCw,
  TrendingDown,
} from "lucide-react";
import {
  adminBtn,
  adminCard,
  adminSelect,
} from "../diagnosis/_components/adminStyles";

type SummaryItem = {
  key: string;
  label: string;
  value: number | null;
  suffix?: string;
  note: string;
};

type FunnelStep = {
  stepKey: string;
  label: string;
  count: number;
  rateFromStart: number | null;
  prevCount: number | null;
  retentionRate: number | null;
  dropoffRate: number | null;
};

type OperationReport = {
  schoolId: string;
  days: number;
  generatedAt: string;
  summary: SummaryItem[];
  qa: {
    chatEnabled: boolean;
    faqItemCount: number;
    sessions: number;
    logCount: number;
    answeredCount: number;
    unansweredCount: number;
    selectViewCount: number;
    ctaClicks: number;
    topQuestions: { question: string; count: number }[];
    recent: {
      id: number;
      sessionId: string;
      timestamp: string;
      label: string;
      answer: string;
      url?: string | null;
      eventType: "cta" | "select" | "answer" | "unanswered";
    }[];
  };
  diagnosis: {
    diagnosisEnabled: boolean;
    totalSessions: number;
    resultViews: number;
    formOpens: number;
    formSubmits: number;
    submissions: number;
    bannerClicks: number;
    clickStats: {
      stepKey: string;
      label: string;
      totalClicks: number;
      uniqueSessions: number;
    }[];
    funnel: FunnelStep[];
    formFieldSteps: {
      stepKey: string;
      label: string;
      reachedCount: number;
      abandonCount: number;
      reachedRate: number | null;
    }[];
  };
  conversions: {
    count: number;
    recent: {
      id: string;
      createdAt: string;
      name: string;
      email: string;
      tel: string;
      course: string;
    }[];
  };
  recommendations: {
    title: string;
    detail: string;
    tone: "ok" | "warn" | "danger";
    href?: string;
    actionLabel?: string;
  }[];
};

const DATE_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return DATE_FORMATTER.format(date);
}

function formatNumber(value: number | null | undefined, suffix = "") {
  if (value == null) return "-";
  return `${value.toLocaleString()}${suffix}`;
}

function appendSchoolId(href: string, schoolId: string) {
  if (!schoolId || href.includes("schoolId=") || href.startsWith("http")) {
    return href;
  }
  return `${href}${href.includes("?") ? "&" : "?"}schoolId=${encodeURIComponent(
    schoolId,
  )}`;
}

function toneClass(tone: "ok" | "warn" | "danger") {
  if (tone === "ok") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100";
  }
  if (tone === "danger") {
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100";
  }
  return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100";
}

function eventLabel(type: OperationReport["qa"]["recent"][number]["eventType"]) {
  if (type === "cta") return "CTA";
  if (type === "select") return "選択肢";
  if (type === "unanswered") return "未回答";
  return "回答";
}

export default function OperationReportClient({
  initialSchoolId,
}: {
  initialSchoolId: string;
}) {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<OperationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const schoolId = report?.schoolId ?? initialSchoolId;

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("days", String(days));
      if (initialSchoolId) params.set("schoolId", initialSchoolId);

      const res = await fetch(`/api/admin/reports?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }

      const data = (await res.json()) as OperationReport;
      setReport(data);
    } catch (err) {
      console.error("[operation report] fetch error:", err);
      setError("運用レポートの取得に失敗しました。ログイン状態とschoolIdを確認してください。");
    } finally {
      setLoading(false);
    }
  }, [days, initialSchoolId]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  const conversionRate = useMemo(() => {
    if (!report || report.diagnosis.totalSessions <= 0) return null;
    return Math.round(
      (report.conversions.count / report.diagnosis.totalSessions) * 100,
    );
  }, [report]);

  return (
    <div className="mx-auto max-w-7xl p-4 text-gray-900 dark:text-gray-100 md:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-950/40 dark:text-sky-200">
            <BarChart3 className="h-4 w-4" aria-hidden />
            運用状況
          </div>
          <h1 className="text-xl font-bold">運用レポート</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Q&amp;A、相性診断、フォーム申込の状況を期間別に確認できます。
          </p>
          {schoolId && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              schoolId: <span className="font-semibold">{schoolId}</span>
            </p>
          )}
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className={[adminSelect, "sm:w-36"].join(" ")}
            aria-label="集計期間"
          >
            <option value={7}>直近7日</option>
            <option value={30}>直近30日</option>
            <option value={90}>直近90日</option>
            <option value={180}>直近180日</option>
          </select>
          <button
            type="button"
            onClick={() => void fetchReport()}
            disabled={loading}
            className={[
              adminBtn,
              "inline-flex min-h-[40px] items-center justify-center gap-2",
            ].join(" ")}
          >
            <RefreshCw
              className={["h-4 w-4", loading ? "animate-spin" : ""].join(" ")}
              aria-hidden
            />
            更新
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        </div>
      )}

      {loading && !report ? (
        <div className={adminCard}>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            読み込み中...
          </div>
        </div>
      ) : report ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {report.summary.map((item) => (
              <div key={item.key} className={adminCard}>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {item.label}
                </div>
                <div className="mt-2 text-2xl font-bold tracking-normal text-gray-950 dark:text-gray-50">
                  {formatNumber(item.value, item.suffix)}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {item.note}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
            <section className={adminCard}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-bold text-gray-950 dark:text-gray-50">
                    <TrendingDown className="h-4 w-4 text-sky-600" aria-hidden />
                    相性診断ファネル
                  </h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    直近{report.days}日 / 診断開始{" "}
                    {report.diagnosis.totalSessions.toLocaleString()}件
                  </p>
                </div>
                <Link
                  href={appendSchoolId("/admin/diagnosis/checklist", schoolId)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  診断完成度
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>

              {report.diagnosis.totalSessions === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  期間内の診断開始ログがありません。
                </div>
              ) : (
                <div className="space-y-3">
                  {report.diagnosis.funnel.map((step) => (
                    <div
                      key={step.stepKey}
                      className="grid gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/40 md:grid-cols-[148px_minmax(0,1fr)_120px]"
                    >
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {step.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {step.stepKey}
                        </div>
                      </div>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                          <div
                            className="h-full rounded-full bg-sky-500"
                            style={{
                              width: `${Math.max(0, step.rateFromStart ?? 0)}%`,
                            }}
                          />
                        </div>
                        <div className="w-14 text-right text-xs font-semibold tabular-nums text-gray-600 dark:text-gray-300">
                          {formatNumber(step.rateFromStart, "%")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold tabular-nums">
                          {step.count.toLocaleString()}件
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          離脱 {formatNumber(step.dropoffRate, "%")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className={adminCard}>
              <div className="mb-4">
                <h2 className="flex items-center gap-2 text-sm font-bold text-gray-950 dark:text-gray-50">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                  改善候補
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  ログから優先確認項目を自動抽出します。
                </p>
              </div>

              <div className="space-y-3">
                {report.recommendations.map((item) => (
                  <div
                    key={item.title}
                    className={[
                      "rounded-xl border p-3 text-sm",
                      toneClass(item.tone),
                    ].join(" ")}
                  >
                    <div className="font-semibold">{item.title}</div>
                    <p className="mt-1 leading-6">{item.detail}</p>
                    {item.href && item.actionLabel && (
                      <Link
                        href={appendSchoolId(item.href, schoolId)}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-4"
                      >
                        {item.actionLabel}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className={adminCard}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-bold text-gray-950 dark:text-gray-50">
                    <MessagesSquare className="h-4 w-4 text-blue-600" aria-hidden />
                    Q&amp;A利用状況
                  </h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    FAQ登録 {report.qa.faqItemCount.toLocaleString()}件 / CTAクリック{" "}
                    {report.qa.ctaClicks.toLocaleString()}件
                  </p>
                </div>
                <Link
                  href={appendSchoolId("/admin/chat-history", schoolId)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  ユーザーログ
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-950/50">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    回答ログ
                  </div>
                  <div className="mt-1 text-lg font-bold">
                    {report.qa.answeredCount.toLocaleString()}件
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-950/50">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    選択肢表示
                  </div>
                  <div className="mt-1 text-lg font-bold">
                    {report.qa.selectViewCount.toLocaleString()}件
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-950/50">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    未回答
                  </div>
                  <div className="mt-1 text-lg font-bold">
                    {report.qa.unansweredCount.toLocaleString()}件
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  よく見られている質問
                </h3>
                {report.qa.topQuestions.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    期間内の質問ログがありません。
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {report.qa.topQuestions.map((item) => (
                      <div
                        key={item.question}
                        className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2 dark:border-gray-800"
                      >
                        <div className="min-w-0 text-sm leading-6">
                          {item.question}
                        </div>
                        <div className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                          {item.count.toLocaleString()}件
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className={adminCard}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-bold text-gray-950 dark:text-gray-50">
                    <ClipboardList className="h-4 w-4 text-violet-600" aria-hidden />
                    申込・フォーム
                  </h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    診断開始比CVR {formatNumber(conversionRate, "%")} / フォーム到達{" "}
                    {report.diagnosis.formOpens.toLocaleString()}件
                  </p>
                </div>
                <Link
                  href={appendSchoolId("/admin/diagnosis/form", schoolId)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  フォーム設定
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>

              {report.conversions.recent.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  期間内のフォーム申込はありません。
                </div>
              ) : (
                <div className="space-y-2">
                  {report.conversions.recent.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-gray-100 px-3 py-3 dark:border-gray-800"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-950 dark:text-gray-50">
                            {item.name}
                          </div>
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(item.createdAt)}
                          </div>
                        </div>
                        {item.course && (
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                            {item.course}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 grid gap-1 text-xs text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                        <div className="min-w-0 truncate">{item.email || "メール未取得"}</div>
                        <div className="min-w-0 truncate">{item.tel || "電話未取得"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className={adminCard}>
              <div className="mb-4">
                <h2 className="flex items-center gap-2 text-sm font-bold text-gray-950 dark:text-gray-50">
                  <MousePointerClick className="h-4 w-4 text-cyan-600" aria-hidden />
                  クリックログ
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  ウィジェット起点のクリックを確認できます。
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {report.diagnosis.clickStats.map((item) => (
                  <div
                    key={item.stepKey}
                    className="rounded-xl bg-gray-50 p-3 dark:bg-gray-950/50"
                  >
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {item.label}
                    </div>
                    <div className="mt-2 text-xl font-bold tabular-nums">
                      {item.totalClicks.toLocaleString()}回
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      ユニーク {item.uniqueSessions.toLocaleString()}人
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className={adminCard}>
              <div className="mb-4">
                <h2 className="text-sm font-bold text-gray-950 dark:text-gray-50">
                  直近Q&amp;Aログ
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  最新12件を種別ごとに表示します。
                </p>
              </div>
              {report.qa.recent.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  期間内のQ&amp;Aログがありません。
                </p>
              ) : (
                <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
                  {report.qa.recent.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-gray-100 px-3 py-2 dark:border-gray-800"
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                          {eventLabel(item.eventType)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(item.timestamp)}
                        </span>
                      </div>
                      <div className="text-sm leading-6 text-gray-900 dark:text-gray-100">
                        {item.label || "（内容なし）"}
                      </div>
                      {item.answer && (
                        <div className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                          {item.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
