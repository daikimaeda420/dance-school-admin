// app/(app)/admin/diagnosis/media/page.tsx
import { Suspense } from "react";
import { getAccessiblePageSchoolId } from "@/lib/authz";
import MediaAdminClient from "./MediaAdminClient";

export const metadata = {
  title: "画像・動画設定 | 診断設定",
};

// 管理画面はビルド時にDBへ接続せず、リクエスト時に描画する
export const dynamic = "force-dynamic";

export default async function MediaAdminPage({
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
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <Suspense fallback={<div>Loading...</div>}>
        <MediaAdminClient schoolId={schoolId} />
      </Suspense>
    </div>
  );
}
