// app/(app)/admin/diagnosis/media/page.tsx
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import MediaAdminClient from "./MediaAdminClient";

export const metadata = {
  title: "画像・動画設定 | 診断設定",
};

export default async function MediaAdminPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const spSchoolId = searchParams?.schoolId;
  let schoolId = "";

  if (typeof spSchoolId === "string" && spSchoolId) {
    schoolId = spSchoolId;
  } else {
    const school = await prisma.faq.findFirst({ select: { schoolId: true } });
    schoolId = school?.schoolId ?? "";
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <Suspense fallback={<div>Loading...</div>}>
        <MediaAdminClient schoolId={schoolId} />
      </Suspense>
    </div>
  );
}
