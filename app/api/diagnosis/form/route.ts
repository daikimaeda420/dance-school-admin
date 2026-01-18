import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/diagnosis/form?schoolId=xxx
 * 診断結果ページ用（公開）
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId");

  if (!schoolId) {
    return NextResponse.json(
      { message: "schoolId is required" },
      { status: 400 },
    );
  }

  const form = await prisma.diagnosisForm.findUnique({
    where: { schoolId },
    include: {
      fields: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!form || !form.isActive) {
    return NextResponse.json(null);
  }

  return NextResponse.json(form);
}
