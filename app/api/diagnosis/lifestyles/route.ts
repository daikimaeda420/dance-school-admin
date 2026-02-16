import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/diagnosis/lifestyles?schoolId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // 両対応
  const schoolId =
    searchParams.get("schoolId") ?? searchParams.get("school") ?? "";

  if (!schoolId) {
    return NextResponse.json(
      { message: "schoolId（または school）パラメータが必要です" },
      { status: 400 },
    );
  }

  const lifestyles = await prisma.diagnosisLifestyle.findMany({
    where: { schoolId, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true, // config.ts の tag と一致する想定
      label: true,
    },
  });

  // フロント側では { id: slug, label: label, tag: slug } のような形で使う想定
  // config.ts 側では tag と slug が一致している必要がある
  const options = lifestyles.map((l) => ({
    id: l.slug,
    label: l.label,
    tag: l.slug, // フィルタリングに使う
  }));

  return NextResponse.json(options);
}
