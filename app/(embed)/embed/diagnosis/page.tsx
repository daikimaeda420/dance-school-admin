// app/(embed)/embed/diagnosis/page.tsx
import DiagnosisEmbedClient from "./DiagnosisEmbedClient";
import { DiagnosisQuestionOption } from "@/lib/diagnosis/config";
import { headers } from "next/headers";

function getOriginFromHeaders() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return null;
  return `${proto}://${host}`;
}

async function fetchOptions(
  path: "campuses" | "courses" | "genres" | "instructors",
  schoolId: string
): Promise<DiagnosisQuestionOption[]> {
  if (!schoolId) return [];

  try {
    const origin = getOriginFromHeaders();
    if (!origin) {
      console.error("Failed to resolve origin from request headers");
      return [];
    }

    const res = await fetch(
      `${origin}/api/diagnosis/${path}?schoolId=${encodeURIComponent(
        schoolId
      )}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      console.error(`Failed to fetch ${path} options`, res.status);
      return [];
    }

    return (await res.json()) as DiagnosisQuestionOption[];
  } catch (e) {
    console.error(`Error while fetching ${path} options`, e);
    return [];
  }
}

export default async function DiagnosisPage({
  searchParams,
}: {
  searchParams: { school?: string; schoolId?: string };
}) {
  // ★ 両対応（schoolId 優先）
  const schoolId = searchParams.schoolId ?? searchParams.school ?? "";

  const [campusOptions, courseOptions, genreOptions, instructorOptions] =
    await Promise.all([
      fetchOptions("campuses", schoolId),
      fetchOptions("courses", schoolId),
      fetchOptions("genres", schoolId),
      fetchOptions("instructors", schoolId),
    ]);

  return (
    <DiagnosisEmbedClient
      schoolIdProp={schoolId}
      campusOptions={campusOptions}
      courseOptions={courseOptions}
      genreOptions={genreOptions}
      instructorOptions={instructorOptions}
    />
  );
}
