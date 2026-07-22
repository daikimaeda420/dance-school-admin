// app/(app)/admin/diagnosis/genres/page.tsx
import { Suspense } from "react";
import { getAccessiblePageSchoolId } from "@/lib/authz";
import GenreAdminClient from "./GenreAdminClient";

export const metadata = {
  title: "ジャンル管理 | 診断設定",
};

// 管理画面はビルド時にDBへ接続せず、リクエスト時に描画する
export const dynamic = "force-dynamic";

export default async function GenreAdminPage({
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
    <div className="w-full">
      <Suspense fallback={<div>Loading...</div>}>
        <GenreAdminClient schoolId={schoolId} />
      </Suspense>
    </div>
  );
}
