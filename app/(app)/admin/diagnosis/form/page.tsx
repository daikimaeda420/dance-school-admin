import FormAdminClient from "./FormAdminClient";
import { getAccessiblePageSchoolId } from "@/lib/authz";

// 管理画面はビルド時にDBへ接続せず、リクエスト時に描画する
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string }>;
}) {
  const sp = await searchParams;
  const schoolId = await getAccessiblePageSchoolId(sp.schoolId);

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
      <div className="mb-4 text-lg font-bold dark:text-gray-100">
        診断編集：フォーム
      </div>
      <FormAdminClient schoolId={schoolId} />
    </div>
  );
}
