// app/admin/diagnosis/layout.tsx
import type { ReactNode } from "react";
import { Suspense } from "react";
import DiagnosisAdminNav from "./_components/DiagnosisAdminNav";

import { prisma } from "@/lib/prisma";

// 管理画面はビルド時にDBへ接続せず、リクエスト時に描画する
export const dynamic = "force-dynamic";

export default async function DiagnosisAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const school = await prisma.faq.findFirst({ select: { schoolId: true } });
  const schoolId = school?.schoolId ?? "";

  return (
    <div className="mx-auto w-full p-6 text-gray-900">
      <Suspense fallback={null}>
        <DiagnosisAdminNav defaultSchoolId={schoolId} />
        {children}
      </Suspense>
    </div>
  );
}
