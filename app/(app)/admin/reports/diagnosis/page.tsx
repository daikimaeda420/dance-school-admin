import OperationReportClient from "../OperationReportClient";

export const dynamic = "force-dynamic";

export default async function DiagnosisReportPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string; school?: string }>;
}) {
  const sp = await searchParams;
  const schoolId = sp.schoolId ?? sp.school ?? "";
  return (
    <OperationReportClient
      initialSchoolId={schoolId}
      view="diagnosis"
      initialReport={null}
    />
  );
}
