// app/admin/diagnosis/courses/page.tsx
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import CourseAdminClient from "./CourseAdminClient";

type Props = {
  searchParams: {
    schoolId?: string;
  };
};

export default async function DiagnosisCoursesPage({ searchParams }: Props) {
  let schoolId = searchParams.schoolId ?? "";

  // schoolIdがない場合、DBから取得（GenreAdminPageと同じロジック）
  if (!schoolId) {
    const school = await prisma.faq.findFirst({ select: { schoolId: true } });
    schoolId = school?.schoolId ?? "";
  }

  return (
    <div className="mx-auto p-6 text-gray-900 dark:text-gray-100">
      <h1 className="mb-4 text-xl font-bold">診断用 コース管理</h1>

      {!schoolId && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">
           schoolId が取得できませんでした。FAQ設定を確認してください。
        </p>
      )}

      <Suspense fallback={<div>Loading...</div>}>
         {/* keyを付与してschoolId変更時に再マウントさせる */}
        <CourseAdminClient key={schoolId} schoolId={schoolId} />
      </Suspense>
    </div>
  );
}
