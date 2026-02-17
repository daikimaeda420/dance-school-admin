// app/(app)/admin/diagnosis/genres/page.tsx
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import GenreAdminClient from "./GenreAdminClient";

export const metadata = {
  title: "ジャンル管理 | 診断設定",
};

export default async function GenreAdminPage() {
  // schoolId はシステム的に1つ（またはコンテキストから取得）想定だが、
  // 既存のパターンに従い最初の一件を取得
  const school = await prisma.faq.findFirst({ select: { schoolId: true } });
  const schoolId = school?.schoolId ?? "";

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <Suspense fallback={<div>Loading...</div>}>
        <GenreAdminClient schoolId={schoolId} />
      </Suspense>
    </div>
  );
}
