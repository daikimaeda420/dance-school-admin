// app/(app)/admin/diagnosis/faqs/page.tsx
import { Suspense } from "react";
import { getAccessiblePageSchoolId } from "@/lib/authz";
import FaqAdminClient from "./FaqAdminClient";

export const metadata = {
  title: "よくある質問 | 診断設定",
};

// 管理画面はビルド時にDBへ接続せず、リクエスト時に描画する
export const dynamic = "force-dynamic";

export default async function FaqAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const spSchoolId = sp?.schoolId;
  const schoolId = await getAccessiblePageSchoolId(
    typeof spSchoolId === "string" ? spSchoolId : "",
  );

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <Suspense fallback={<div>Loading...</div>}>
        <FaqAdminClient schoolId={schoolId} />
      </Suspense>
    </div>
  );
}
