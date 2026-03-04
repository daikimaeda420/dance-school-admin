// app/(app)/admin/diagnosis/faqs/page.tsx
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import FaqAdminClient from "./FaqAdminClient";

export const metadata = {
  title: "よくある質問 | 診断設定",
};

export default async function FaqAdminPage({
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
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <Suspense fallback={<div>Loading...</div>}>
        <FaqAdminClient schoolId={schoolId} />
      </Suspense>
    </div>
  );
}
