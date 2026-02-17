// app/api/diagnosis/genres/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/diagnosis/genres?schoolId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId") ?? searchParams.get("school") ?? "";

  if (!schoolId) {
    return NextResponse.json(
      { message: "schoolId パラメータが必要です" },
      { status: 400 },
    );
  }

  const genres = await prisma.diagnosisGenre.findMany({
    where: { schoolId, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      label: true,
    },
  });

  const options = genres.map((g) => ({
    id: g.slug,
    label: g.label,
    tag: g.slug,
  }));

  return NextResponse.json(options);
}
