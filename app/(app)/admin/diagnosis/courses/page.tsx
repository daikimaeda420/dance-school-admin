// app/admin/diagnosis/courses/page.tsx
import { Suspense } from "react";
import { getAccessiblePageSchoolId } from "@/lib/authz";
import CourseAdminClient from "./CourseAdminClient";

type Props = {
  searchParams: Promise<{
    schoolId?: string;
  }>;
};

// 管理画面はビルド時にDBへ接続せず、リクエスト時に描画する
export const dynamic = "force-dynamic";

export default async function DiagnosisCoursesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const schoolId = await getAccessiblePageSchoolId(sp.schoolId);

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
