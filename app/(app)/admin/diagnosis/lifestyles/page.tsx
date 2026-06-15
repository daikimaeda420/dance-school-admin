// app/admin/diagnosis/lifestyles/page.tsx
import LifestyleAdminClient from "./LifestyleAdminClient";
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
  return (
    <div className="p-6">
      <LifestyleAdminClient schoolId={schoolId} />
    </div>
  );
}
