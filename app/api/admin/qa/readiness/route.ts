import { NextRequest, NextResponse } from "next/server";
import { resolveAccessibleSchool } from "@/lib/authz";
import { getFaqReadinessReport } from "@/lib/faq/readiness";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const requestedSchoolId =
      url.searchParams.get("schoolId") ?? url.searchParams.get("school");
    const access = await resolveAccessibleSchool(requestedSchoolId);
    if (!access.ok) return access.response;

    const schoolId = access.schoolId;
    const report = await getFaqReadinessReport(schoolId);

    return NextResponse.json({
      ...report.summary,
      href: `/admin/qa/checklist?schoolId=${encodeURIComponent(schoolId)}`,
    });
  } catch (error) {
    console.error("[qa readiness] error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
