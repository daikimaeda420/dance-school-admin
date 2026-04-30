// app/admin/diagnosis/instructors/page.tsx
import InstructorAdminClient from "./InstructorAdminClient";

// 管理画面はビルド時にDBへ接続せず、リクエスト時に描画する
export const dynamic = "force-dynamic";

export default function Page({
  searchParams,
}: {
  searchParams: { schoolId?: string };
}) {
  const initialSchoolId = searchParams.schoolId ?? "";
  return <InstructorAdminClient initialSchoolId={initialSchoolId} />;
}
