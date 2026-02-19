// app/(app)/admin/diagnosis/genres/page.tsx
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import GenreAdminClient from "./GenreAdminClient";

export const metadata = {
  title: "ジャンル管理 | 診断設定",
};

export default async function GenreAdminPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const spSchoolId = searchParams?.schoolId;
  let schoolId = "";

  if (typeof spSchoolId === "string" && spSchoolId) {
    schoolId = spSchoolId;
  } else {
    // パラメータがない場合はデフォルト
    const school = await prisma.faq.findFirst({ select: { schoolId: true } });
    schoolId = school?.schoolId ?? "";
  }

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <Suspense fallback={<div>Loading...</div>}>
        <GenreAdminClient schoolId={schoolId} />
      </Suspense>
    </div>
  );
}
