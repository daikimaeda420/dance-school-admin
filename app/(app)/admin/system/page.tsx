import { AlertCircle, CheckCircle2, Settings } from "lucide-react";
import { getPrincipal } from "@/lib/authz";

export const dynamic = "force-dynamic";

const REQUIRED_ENV_KEYS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "NEXT_PUBLIC_BASE_URL",
  "NEXT_PUBLIC_RIZBO_API_ORIGIN",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
];

export default async function SystemPage() {
  const principal = await getPrincipal();

  if (!principal) {
    return (
      <div className="p-6 text-sm text-red-600 dark:text-red-300">
        ログインが必要です。
      </div>
    );
  }

  if (!principal.isSuperAdmin) {
    return (
      <div className="p-6 text-sm text-red-600 dark:text-red-300">
        このページを表示する権限がありません。
      </div>
    );
  }

  const rows = REQUIRED_ENV_KEYS.map((key) => ({
    key,
    configured: Boolean(process.env[key]?.trim()),
  }));

  const missing = rows.filter((row) => !row.configured);

  return (
    <div className="mx-auto max-w-5xl p-6 text-gray-900 dark:text-gray-100">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-gray-900 p-2 text-white dark:bg-gray-100 dark:text-gray-900">
          <Settings className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-bold">システム設定</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            環境変数の設定状況を確認できます。
          </p>
        </div>
      </div>

      <section className="card mb-6">
        <div className="card-header flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">環境変数</h2>
          <span
            className={[
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              missing.length
                ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200",
            ].join(" ")}
          >
            {missing.length ? `${missing.length}件 未設定` : "すべて設定済み"}
          </span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            >
              <span className="font-mono text-xs text-gray-700 dark:text-gray-200">
                {row.key}
              </span>
              {row.configured ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  設定済み
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-200">
                  <AlertCircle className="h-4 w-4" aria-hidden />
                  未設定
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h2 className="text-sm font-semibold">実行環境</h2>
        </div>
        <div className="grid gap-3 p-4 text-sm sm:grid-cols-3">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">NODE_ENV</div>
            <div className="mt-1 font-mono">{process.env.NODE_ENV ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">APP_VERSION</div>
            <div className="mt-1 font-mono">
              {process.env.NEXT_PUBLIC_APP_VERSION || "-"}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">schoolId</div>
            <div className="mt-1 font-mono">{principal.schoolId || "-"}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
