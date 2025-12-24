// app/api/diagnosis/links/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") ?? "") as "genres" | "campuses";
    const schoolId = searchParams.get("schoolId") ?? "";
    const resultId = searchParams.get("resultId") ?? "";

    if (!schoolId || !resultId)
      return NextResponse.json([] as string[], { status: 200 });
    if (type !== "genres" && type !== "campuses")
      return NextResponse.json([] as string[], { status: 200 });

    const result = await prisma.diagnosisResult.findFirst({
      where: { id: resultId, schoolId },
      select:
        type === "genres"
          ? { genres: { where: { isActive: true }, select: { id: true } } }
          : { campuses: { where: { isActive: true }, select: { id: true } } },
    });

    if (!result) return NextResponse.json([] as string[], { status: 200 });

    const ids =
      type === "genres"
        ? (result as any).genres.map((g: any) => g.id)
        : (result as any).campuses.map((c: any) => c.id);

    return NextResponse.json(ids, { status: 200 });
  } catch (e: any) {
    console.error("[GET /api/diagnosis/links] error", e);
    return NextResponse.json([] as string[], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const type: "genres" | "campuses" = body?.type;
    const schoolId: string = body?.schoolId ?? "";
    const resultId: string = body?.resultId ?? "";

    if (!type || (type !== "genres" && type !== "campuses")) {
      return NextResponse.json(
        { ok: false, message: "type が不正です" },
        { status: 400 }
      );
    }
    if (!schoolId || !resultId) {
      return NextResponse.json(
        { ok: false, message: "schoolId / resultId は必須です" },
        { status: 400 }
      );
    }

    // ✅ 所有確認（安全）
    const owned = await prisma.diagnosisResult.findFirst({
      where: { id: resultId, schoolId },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json(
        { ok: false, message: "指定された結果が見つかりません" },
        { status: 404 }
      );
    }

    // -------------------------
    // ✅ genres：id優先、なければslug
    // -------------------------
    if (type === "genres") {
      const genreIdsRaw: string[] = Array.isArray(body?.genreIds)
        ? body.genreIds
        : [];
      const genreSlugsRaw: string[] = Array.isArray(body?.genreSlugs)
        ? body.genreSlugs
        : [];

      const genreIds = Array.from(
        new Set(genreIdsRaw.map((v) => String(v).trim()).filter(Boolean))
      );
      const genreSlugs = Array.from(
        new Set(genreSlugsRaw.map((v) => String(v).trim()).filter(Boolean))
      );

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

      const updated = await prisma.diagnosisResult.update({
        where: { id: resultId },
        data: { genres: { set: validGenreIds.map((id) => ({ id })) } },
        include: { genres: { select: { id: true, slug: true, label: true } } },
      });

      return NextResponse.json(
        { ok: true, type, input: { genreIds, genreSlugs }, updated },
        { status: 200 }
      );
    }

    // -------------------------
    // ✅ campuses：id優先、なければslug
    // -------------------------
    const campusIdsRaw: string[] = Array.isArray(body?.campusIds)
      ? body.campusIds
      : [];
    const campusSlugsRaw: string[] = Array.isArray(body?.campusSlugs)
      ? body.campusSlugs
      : [];

    const campusIds = Array.from(
      new Set(campusIdsRaw.map((v) => String(v).trim()).filter(Boolean))
    );
    const campusSlugs = Array.from(
      new Set(campusSlugsRaw.map((v) => String(v).trim()).filter(Boolean))
    );

    const validCampuses = await prisma.diagnosisCampus.findMany({
      where: {
        schoolId,
        isActive: true,
        ...(campusIds.length > 0
          ? { id: { in: campusIds } }
          : campusSlugs.length > 0
          ? { slug: { in: campusSlugs } }
          : { id: { in: [] } }),
      },
      select: { id: true },
    });

    const validCampusIds = validCampuses.map((c) => c.id);

    const updated = await prisma.diagnosisResult.update({
      where: { id: resultId },
      data: { campuses: { set: validCampusIds.map((id) => ({ id })) } },
      include: { campuses: { select: { id: true, slug: true, label: true } } },
    });

    return NextResponse.json(
      { ok: true, type, input: { campusIds, campusSlugs }, updated },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[POST /api/diagnosis/links] error", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "紐づけの更新に失敗しました" },
      { status: 500 }
    );
  }
}
