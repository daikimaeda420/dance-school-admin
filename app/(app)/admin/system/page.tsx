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
      <div className="p-6 text-sm text-red-600">
        ログインが必要です。
      </div>
    );
  }

  if (!principal.isSuperAdmin) {
    return (
      <div className="p-6 text-sm text-red-600">
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
    <div className="mx-auto max-w-[1540px] px-4 py-6 text-slate-800 md:px-6">
      <div className="mb-6">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
            <Settings className="h-5 w-5 text-[#fe6147]" aria-hidden />
            システム設定
          </h1>
          <p className="mt-1 text-sm text-slate-500">
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
                ? "bg-red-50 text-red-700"
                : "bg-emerald-50 text-emerald-700",
            ].join(" ")}
          >
            {missing.length ? `${missing.length}件 未設定` : "すべて設定済み"}
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            >
              <span className="font-mono text-xs text-slate-700">
                {row.key}
              </span>
              {row.configured ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  設定済み
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
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
            <div className="text-xs text-slate-500">NODE_ENV</div>
            <div className="mt-1 font-mono">{process.env.NODE_ENV ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">APP_VERSION</div>
            <div className="mt-1 font-mono">
              {process.env.NEXT_PUBLIC_APP_VERSION || "-"}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">schoolId</div>
            <div className="mt-1 font-mono">{principal.schoolId || "-"}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
