// app/api/diagnosis/links/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "";
    const schoolId = searchParams.get("schoolId") ?? "";
    const resultId = searchParams.get("resultId") ?? "";

    // ✅ GETは「常に200 + 配列」で返す（フロントを絶対落とさない）
    if (type !== "genres") {
      return NextResponse.json([] as string[], { status: 200 });
    }
    if (!schoolId || !resultId) {
      return NextResponse.json([] as string[], { status: 200 });
    }

    const result = await prisma.diagnosisResult.findFirst({
      where: { id: resultId, schoolId },
      select: {
        genres: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    });

    if (!result) {
      return NextResponse.json([] as string[], { status: 200 });
    }

    return NextResponse.json(
      result.genres.map((g) => g.id),
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[GET /api/diagnosis/links] error", e);
    return NextResponse.json([] as string[], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const schoolId: string = body?.schoolId ?? "";
    const resultId: string = body?.resultId ?? "";

    const genreIdsRaw: string[] = Array.isArray(body?.genreIds)
      ? body.genreIds
      : [];
    const genreSlugsRaw: string[] = Array.isArray(body?.genreSlugs)
      ? body.genreSlugs
      : [];

    if (!schoolId || !resultId) {
      return NextResponse.json(
        { ok: false, message: "schoolId / resultId は必須です" },
        { status: 400 }
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

    // ✅ ここが安全：必ず schoolId も条件に含める
    const updatedCount = await prisma.diagnosisResult.updateMany({
      where: { id: resultId, schoolId },
      data: {
        genres: {
          set: validGenreIds.map((id) => ({ id })),
        },
      },
    });

    if (updatedCount.count === 0) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "指定された結果が見つかりません（schoolId / resultId を確認）",
        },
        { status: 404 }
      );
    }

    // 表示用に返す（任意）
    const updated = await prisma.diagnosisResult.findFirst({
      where: { id: resultId, schoolId },
      include: { genres: { select: { id: true, slug: true, label: true } } },
    });

    return NextResponse.json({
      ok: true,
      input: { genreIds, genreSlugs },
      updated,
    });
  } catch (e: any) {
    console.error("[POST /api/diagnosis/links] error", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "紐づけの更新に失敗しました" },
      { status: 500 }
    );
  }
}
