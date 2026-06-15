import { NextRequest, NextResponse } from "next/server";
import { resolveAccessibleSchool } from "@/lib/authz";
import { getDiagnosisReadinessReport } from "@/lib/diagnosis/readiness";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const requestedSchoolId =
      url.searchParams.get("schoolId") ?? url.searchParams.get("school");
    const access = await resolveAccessibleSchool(requestedSchoolId);
    if (!access.ok) return access.response;

    const schoolId = access.schoolId;
    const report = await getDiagnosisReadinessReport(schoolId);

    return NextResponse.json({
      ...report.summary,
      href: `/admin/diagnosis/checklist?schoolId=${encodeURIComponent(schoolId)}`,
    });
  } catch (error) {
    console.error("[diagnosis readiness] error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
