// app/admin/diagnosis/instructors/page.tsx
import InstructorAdminClient from "./InstructorAdminClient";
import { getAccessiblePageSchoolId } from "@/lib/authz";

// 管理画面はビルド時にDBへ接続せず、リクエスト時に描画する
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string }>;
}) {
  const sp = await searchParams;
  const initialSchoolId = await getAccessiblePageSchoolId(sp.schoolId);
  return <InstructorAdminClient initialSchoolId={initialSchoolId} />;
}
