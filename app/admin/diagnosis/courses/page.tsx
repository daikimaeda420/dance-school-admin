// app/admin/diagnosis/courses/page.tsx
import CourseAdminClient from "./CourseAdminClient";

export default function DiagnosisCoursesPage({
  searchParams,
}: {
  searchParams: { schoolId?: string };
}) {
  const schoolId = searchParams.schoolId ?? "";

  return (
    <div className="mx-auto max-w-5xl p-6 text-gray-900 dark:text-gray-100">
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

      <CourseAdminClient schoolId={schoolId} />
    </div>
  );
}
