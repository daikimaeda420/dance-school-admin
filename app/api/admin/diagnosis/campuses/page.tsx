// app/(admin)/admin/diagnosis/campuses/page.tsx
import CampusAdminClient from "./CampusAdminClient";

export default function DiagnosisCampusesPage({
  searchParams,
}: {
  searchParams: { schoolId?: string };
}) {
  // ?schoolId=links みたいな形で指定
  const schoolId = searchParams.schoolId ?? "";

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-xl font-bold">診断用 校舎管理</h1>
      {!schoolId && (
        <p className="mb-4 text-sm text-red-500">
          URL に <code>?schoolId=links</code> のように schoolId
          を指定してください。
        </p>
      )}
      <CampusAdminClient schoolId={schoolId} />
    </div>
  );
}
