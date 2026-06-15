import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  CircleX,
  Gauge,
  MessagesSquare,
} from "lucide-react";
import { getAccessiblePageSchoolId } from "@/lib/authz";
import {
  FaqReadinessStatus,
  getFaqReadinessReport,
} from "@/lib/faq/readiness";
import { adminCard } from "../../diagnosis/_components/adminStyles";

export const dynamic = "force-dynamic";

const STATUS_META: Record<
  FaqReadinessStatus,
  {
    label: string;
    icon: typeof CheckCircle2;
    badgeClass: string;
    iconClass: string;
  }
> = {
  ok: {
    label: "OK",
    icon: CheckCircle2,
    badgeClass:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200",
    iconClass: "text-emerald-600 dark:text-emerald-300",
  },
  warn: {
    label: "要確認",
    icon: CircleAlert,
    badgeClass:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200",
    iconClass: "text-amber-600 dark:text-amber-300",
  },
  missing: {
    label: "未設定",
    icon: CircleX,
    badgeClass:
      "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200",
    iconClass: "text-red-600 dark:text-red-300",
  },
};

export default async function FaqChecklistPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string; school?: string }>;
}) {
  const sp = await searchParams;
  const schoolId = await getAccessiblePageSchoolId(sp.schoolId ?? sp.school);

  if (!schoolId) {
    return (
      <div className="mx-auto max-w-5xl p-6 text-gray-900 dark:text-gray-100">
        <div className={adminCard}>
          <div className="flex items-start gap-3 text-sm text-red-700 dark:text-red-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div>
              <div className="font-semibold">schoolId が取得できません。</div>
              <div className="mt-1 text-gray-600 dark:text-gray-300">
                URL に <code>?schoolId=xxx</code> を付けるか、ログイン中の学校設定を確認してください。
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const report = await getFaqReadinessReport(schoolId);
  const SummaryIcon = STATUS_META[report.summary.status].icon;

  return (
    <div className="mx-auto max-w-6xl p-4 text-gray-900 dark:text-gray-100 md:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
            <MessagesSquare className="h-4 w-4" aria-hidden />
            Q&amp;Aチャットボット
          </div>
          <h1 className="text-xl font-bold">完成度チェック</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            公開設定・回答内容・申込導線・運用ログをまとめて確認できます。
          </p>
        </div>

        <div
          className={[
            "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold",
            STATUS_META[report.summary.status].badgeClass,
          ].join(" ")}
        >
          <SummaryIcon className="h-4 w-4" aria-hidden />
          {report.summary.statusLabel}
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {report.stats.map((stat) => (
          <div key={stat.label} className={adminCard}>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {stat.label}
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="text-2xl font-bold tracking-normal text-gray-950 dark:text-gray-50">
                {stat.value}
              </div>
              {stat.label === "完成度" && (
                <Gauge className="h-5 w-5 text-blue-500" aria-hidden />
              )}
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {stat.caption}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-5">
        {report.groups.map((group) => (
          <section key={group.title} className={adminCard}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-gray-950 dark:text-gray-50">
                  {group.title}
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {group.description}
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                {group.items.filter((item) => item.status === "ok").length}/
                {group.items.length} OK
              </span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {group.items.map((item) => {
                const meta = STATUS_META[item.status];
                const Icon = meta.icon;

                return (
                  <div
                    key={item.title}
                    className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="flex min-w-0 gap-3">
                      <Icon
                        className={["mt-0.5 h-5 w-5 shrink-0", meta.iconClass].join(
                          " ",
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-950 dark:text-gray-50">
                            {item.title}
                          </h3>
                          <span
                            className={[
                              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              meta.badgeClass,
                            ].join(" ")}
                          >
                            {meta.label}
                          </span>
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                            {item.summary}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                          {item.detail}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center md:justify-end">
                      <Link
                        href={item.href}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        {item.actionLabel}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
