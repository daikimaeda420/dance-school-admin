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
    <div className="mx-auto w-full p-6 text-gray-900">
      <Suspense fallback={null}>
        <DiagnosisAdminNav defaultSchoolId={schoolId} />
        {children}
      </Suspense>
    </div>
  );
}
