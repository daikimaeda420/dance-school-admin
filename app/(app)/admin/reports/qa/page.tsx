import OperationReportClient from "../OperationReportClient";
import type { OperationReport } from "../OperationReportClient";
import { fetchInternalJson } from "@/lib/internalApi";

export const dynamic = "force-dynamic";

export default async function QaReportPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string; school?: string }>;
}) {
  const sp = await searchParams;
  const schoolId = sp.schoolId ?? sp.school ?? "";
  const params = new URLSearchParams({ days: "30" });
  if (schoolId) params.set("schoolId", schoolId);
  const initialReport = await fetchInternalJson<OperationReport>(
    `/api/admin/reports?${params.toString()}`,
  );
  return (
    <OperationReportClient
      initialSchoolId={schoolId}
      view="qa"
      initialReport={initialReport}
    />
  );
}
