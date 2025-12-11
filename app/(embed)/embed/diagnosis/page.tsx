// app/(embed)/embed/diagnosis/page.tsx
import DiagnosisEmbedClient from "./DiagnosisEmbedClient";
import { DiagnosisQuestionOption } from "@/lib/diagnosis/config";

async function fetchCampusOptions(
  schoolId: string
): Promise<DiagnosisQuestionOption[]> {
  if (!schoolId) return [];

  const res = await fetch(
    `${
      process.env.NEXT_PUBLIC_BASE_URL
    }/api/diagnosis/campuses?school=${encodeURIComponent(schoolId)}`,
    {
      cache: "no-store",
    }
  );

  if (!res.ok) return [];

  return (await res.json()) as DiagnosisQuestionOption[];
}

export default async function DiagnosisPage({
  searchParams,
}: {
  searchParams: { school?: string };
}) {
  const schoolId = searchParams.school ?? "";
  const campusOptions = await fetchCampusOptions(schoolId);

  return (
    <DiagnosisEmbedClient
      schoolIdProp={schoolId}
      campusOptions={campusOptions}
    />
  );
}
