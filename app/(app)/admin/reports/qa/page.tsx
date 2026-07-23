import OperationReportClient from "../OperationReportClient";

export const dynamic = "force-dynamic";

export default async function QaReportPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string; school?: string }>;
}) {
  const sp = await searchParams;
  const schoolId = sp.schoolId ?? sp.school ?? "";
  return (
    <OperationReportClient
      initialSchoolId={schoolId}
      view="qa"
      initialReport={null}
    />
  );
}
