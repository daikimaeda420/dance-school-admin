import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // 両対応
  const schoolId =
    searchParams.get("schoolId") ?? searchParams.get("school") ?? "";

  if (!schoolId) {
    return NextResponse.json(
      { message: "schoolId（または school）パラメータが必要です" },
      { status: 400 }
    );
  }

  const courses = await prisma.diagnosisCourse.findMany({
    where: { schoolId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const options = courses.map((c) => ({
    id: c.slug,
    label: c.label,
  }));

  return NextResponse.json(options);
}
