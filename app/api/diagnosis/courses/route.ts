// app/api/diagnosis/courses/route.ts
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
    select: {
      id: true, // ✅ DBのID（cuid）
      slug: true, // ✅ 既存互換のIDとして使っている
      label: true,
      sortOrder: true,
      isActive: true,
      q2AnswerTags: true, // ✅ 追加
    },
  });

  // 互換維持：id は slug を返す（既存UIを壊さない）
  const options = courses.map((c) => ({
    id: c.slug, // ← ここ重要：今まで通り
    dbId: c.id, // ✅ 新規追加：必要ならDB操作に使える
    label: c.label,
    q2AnswerTags: c.q2AnswerTags ?? [], // ✅ 追加
  }));

  return NextResponse.json(options);
}
