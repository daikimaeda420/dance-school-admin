// app/api/diagnosis/campuses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DiagnosisQuestionOption } from "@/lib/diagnosis/config";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // ✅ 後方互換：school / schoolId どちらでもOK
  const schoolId =
    searchParams.get("schoolId") ?? searchParams.get("school") ?? "";

  // ✅ 追加：詳細返却フラグ
  const full = searchParams.get("full") === "1";

  if (!schoolId) {
    return NextResponse.json(
      { message: "schoolId（または school）パラメータが必要です" },
      { status: 400 }
    );
  }

  const campuses = await prisma.diagnosisCampus.findMany({
    where: { schoolId, isActive: true },
    orderBy: { sortOrder: "asc" },
    // ✅ full=1 のときだけ詳細も返す（selectで明示すると安定）
    select: full
      ? {
          id: true,
          schoolId: true,
          label: true,
          slug: true,
          sortOrder: true,
          isOnline: true,
          isActive: true,
          address: true,
          access: true,
          googleMapUrl: true,
        }
      : {
          label: true,
          slug: true,
          isOnline: true,
        },
  });

  if (!full) {
    const options: DiagnosisQuestionOption[] = campuses.map((c) => ({
      id: c.slug,
      label: c.label,
      isOnline: c.isOnline,
    }));
    return NextResponse.json(options);
  }

  // full=1 のときは詳細を返す（管理画面や詳細表示用）
  return NextResponse.json(campuses);
}
