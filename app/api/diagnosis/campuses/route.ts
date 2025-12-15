// app/api/diagnosis/campuses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DiagnosisQuestionOption } from "@/lib/diagnosis/config";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // ✅ 後方互換：school / schoolId どちらでもOK
  const schoolId =
    searchParams.get("schoolId") ?? searchParams.get("school") ?? "";

  if (!schoolId) {
    return NextResponse.json(
      { message: "schoolId（または school）パラメータが必要です" },
      { status: 400 }
    );
  }

  const campuses = await prisma.diagnosisCampus.findMany({
    where: { schoolId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const options: DiagnosisQuestionOption[] = campuses.map((c) => ({
    id: c.slug,
    label: c.label,
    isOnline: c.isOnline,
  }));

  return NextResponse.json(options);
}
