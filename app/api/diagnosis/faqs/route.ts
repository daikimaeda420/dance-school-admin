// app/api/diagnosis/faqs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/diagnosis/faqs?schoolId=xxx — 公開（埋め込みページ用）
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const schoolId =
    searchParams.get("schoolId") ?? searchParams.get("school") ?? "";

  if (!schoolId) {
    return NextResponse.json(
      { message: "schoolId パラメータが必要です" },
      { status: 400 },
    );
  }

  const rows = await prisma.diagnosisFaq.findMany({
    where: { schoolId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, question: true, answer: true, sortOrder: true },
  });

  return NextResponse.json(rows);
}
