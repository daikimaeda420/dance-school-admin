// app/admin/diagnosis/courses/page.tsx
import { Suspense } from "react";
import CourseAdminClient from "./CourseAdminClient";

type Props = {
  searchParams: {
    schoolId?: string;
  };
};

export default function DiagnosisCoursesPage({ searchParams }: Props) {
  const schoolId = searchParams.schoolId ?? "";

  return (
    <div className="mx-auto p-6 text-gray-900 dark:text-gray-100">
      <h1 className="mb-4 text-xl font-bold">診断用 コース管理</h1>

      {!schoolId && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">
          URL に{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px] text-gray-800 dark:bg-gray-800 dark:text-gray-100">
            ?schoolId=links
          </code>{" "}
          のように schoolId を指定してください。
        </p>
      )}

      <Suspense fallback={null}>
        <CourseAdminClient schoolId={schoolId} />
      </Suspense>
    </div>
  );
}
