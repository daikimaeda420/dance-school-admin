import OperationReportClient from "../OperationReportClient";

export const dynamic = "force-dynamic";

export default async function DiagnosisReportPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string; school?: string }>;
}) {
  const sp = await searchParams;
  return (
    <OperationReportClient
      initialSchoolId={sp.schoolId ?? sp.school ?? ""}
      view="diagnosis"
    />
  );
}
