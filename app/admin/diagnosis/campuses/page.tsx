// app/admin/diagnosis/campuses/page.tsx
import { Suspense } from "react";
import CampusAdminClient from "./CampusAdminClient";

// 管理画面は静的生成させない（SSG/Export時のprerender事故を防ぐ）
export const dynamic = "force-dynamic";

export default function DiagnosisCampusesPage({
  searchParams,
}: {
  searchParams: { schoolId?: string };
}) {
  const schoolId = searchParams.schoolId ?? "";

  return (
    <div className="mx-auto max-w-5xl p-6 text-gray-900 dark:text-gray-100">
      <h1 className="mb-4 text-xl font-bold">診断用 校舎管理</h1>

      {!schoolId && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">
          URL に{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px] text-gray-800 dark:bg-gray-800 dark:text-gray-100">
            ?schoolId=links
          </code>{" "}
          のように schoolId を指定してください。
        </p>
      )}

      {/* useSearchParams() を使うクライアント側を Suspense で包む */}
      <Suspense
        fallback={<div className="text-sm text-gray-500">Loading...</div>}
      >
        <CampusAdminClient schoolId={schoolId} />
      </Suspense>
    </div>
  );
}
