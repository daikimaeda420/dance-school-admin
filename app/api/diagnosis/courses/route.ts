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
      { status: 400 },
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
      q2AnswerTags: true,

      // ✅ 追加：画像（判定にだけ使う：Bytesは返さない）
      photoMime: true,
      photoData: true,
    },
  });

  // 互換維持：id は slug を返す（既存UIを壊さない）
  const options = courses.map((c) => {
    const hasImage =
      Boolean(c.photoMime) &&
      Boolean(c.photoData) &&
      (c.photoData as any)?.length > 0;

    const photoUrl = hasImage
      ? `/api/diagnosis/courses/photo?schoolId=${encodeURIComponent(
          schoolId,
        )}&id=${encodeURIComponent(c.id)}`
      : null;

    return {
      id: c.slug, // ← ここ重要：今まで通り
      dbId: c.id, // ✅ DB操作用
      slug: c.slug,
      label: c.label,
      sortOrder: c.sortOrder,
      isActive: c.isActive,

      q2AnswerTags: c.q2AnswerTags ?? [],

      // ✅ 追加
      answerTag: c.answerTag ?? null,

      // ✅ 追加
      hasImage,
      photoUrl,
    };
  });

  return NextResponse.json(options);
}
