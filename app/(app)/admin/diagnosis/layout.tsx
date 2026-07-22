// app/admin/diagnosis/layout.tsx
import type { ReactNode } from "react";
import { Suspense } from "react";
import DiagnosisAdminNav from "./_components/DiagnosisAdminNav";
import { getAccessiblePageSchoolId } from "@/lib/authz";

// 管理画面はビルド時にDBへ接続せず、リクエスト時に描画する
export const dynamic = "force-dynamic";

export default async function DiagnosisAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const schoolId = await getAccessiblePageSchoolId("");

  return (
    <div className="mx-auto w-full max-w-[1540px] px-4 py-6 text-slate-900 md:px-6">
      <Suspense fallback={null}>
        <DiagnosisAdminNav defaultSchoolId={schoolId} />
        {children}
      </Suspense>
    </div>
  );
}
