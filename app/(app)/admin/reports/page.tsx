import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OperationReportPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string; school?: string }>;
}) {
  const sp = await searchParams;
  const schoolId = sp.schoolId ?? sp.school;
  redirect(
    schoolId
      ? `/admin/reports/diagnosis?schoolId=${encodeURIComponent(schoolId)}`
      : "/admin/reports/diagnosis",
  );
}
