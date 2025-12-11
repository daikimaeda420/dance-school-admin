// app/(embed)/embed/diagnosis/page.tsx
import DiagnosisEmbedClient from "./DiagnosisEmbedClient";
import { DiagnosisQuestionOption } from "@/lib/diagnosis/config";

async function fetchCampusOptions(
  schoolId: string
): Promise<DiagnosisQuestionOption[]> {
  if (!schoolId) return [];

  try {
    // 相対パスで叩く：ローカル・本番どちらでも動く
    const res = await fetch(
      `/api/diagnosis/campuses?school=${encodeURIComponent(schoolId)}`,
      {
        cache: "no-store",
      }
    );

    if (!res.ok) {
      console.error("Failed to fetch campus options", res.status);
      return [];
    }

    return (await res.json()) as DiagnosisQuestionOption[];
  } catch (e) {
    console.error("Error while fetching campus options", e);
    return [];
  }
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
