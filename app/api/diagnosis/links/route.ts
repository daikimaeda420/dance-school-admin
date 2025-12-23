// app/api/diagnosis/links/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const schoolId: string = body?.schoolId ?? "";
  const resultId: string = body?.resultId ?? "";

  // ✅ 互換：genreIds（id配列） or genreSlugs（slug配列）
  const genreIdsRaw: string[] = Array.isArray(body?.genreIds)
    ? body.genreIds
    : [];
  const genreSlugsRaw: string[] = Array.isArray(body?.genreSlugs)
    ? body.genreSlugs
    : [];

  if (!schoolId || !resultId) {
    return NextResponse.json(
      { message: "schoolId / resultId は必須です" },
      { status: 400 }
    );
  }

  // 念のため：Resultがそのschoolのものか確認
  const result = await prisma.diagnosisResult.findFirst({
    where: { id: resultId, schoolId },
    select: { id: true },
  });
  if (!result) {
    return NextResponse.json(
      {
        message: "指定された結果が見つかりません（schoolId / resultId を確認）",
      },
      { status: 404 }
    );
  }

  // ✅ 送られてきた値を正規化（空や重複を除去）
  const genreIds = Array.from(
    new Set(genreIdsRaw.map((v) => String(v).trim()).filter(Boolean))
  );
  const genreSlugs = Array.from(
    new Set(genreSlugsRaw.map((v) => String(v).trim()).filter(Boolean))
  );

  // ✅ id優先。idが無ければslugから引く
  const validGenres = await prisma.diagnosisGenre.findMany({
    where: {
      schoolId,
      isActive: true,
      ...(genreIds.length > 0
        ? { id: { in: genreIds } }
        : genreSlugs.length > 0
        ? { slug: { in: genreSlugs } }
        : { id: { in: [] } }),
    },
    select: { id: true },
  });

  const validGenreIds = validGenres.map((g) => g.id);

  try {
    const updated = await prisma.diagnosisResult.update({
      where: { id: resultId },
      data: {
        genres: {
          set: validGenreIds.map((id) => ({ id })),
        },
      },
      include: { genres: { select: { id: true, slug: true, label: true } } },
    });

    return NextResponse.json({
      ok: true,
      input: { genreIds, genreSlugs },
      updated,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { message: e?.message ?? "紐づけの更新に失敗しました" },
      { status: 500 }
    );
  }
}
