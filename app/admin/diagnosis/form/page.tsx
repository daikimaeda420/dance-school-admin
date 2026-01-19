import FormAdminClient from "./FormAdminClient";

export default function Page({
  searchParams,
}: {
  searchParams: { schoolId?: string };
}) {
  const schoolId = searchParams.schoolId ?? "";

  if (!schoolId) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-4 text-sm">
          schoolId が指定されていません。
          <br />
          URL に <code>?schoolId=xxx</code> を付けてください。
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 text-lg font-bold">診断編集：フォーム</div>
      <FormAdminClient schoolId={schoolId} />
    </div>
  );
}
