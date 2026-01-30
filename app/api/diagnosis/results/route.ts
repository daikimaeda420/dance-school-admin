// app/api/diagnosis/results/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const schoolId = searchParams.get("schoolId") ?? "";
  const includeInactive = searchParams.get("includeInactive") === "true";

  if (!schoolId) {
    return NextResponse.json(
      { error: "NO_SCHOOL_ID", message: "schoolId が指定されていません。" },
      { status: 400 },
    );
  }

  const rows = await prisma.diagnosisResult.findMany({
    where: {
      schoolId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      sortOrder: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(rows);
}
