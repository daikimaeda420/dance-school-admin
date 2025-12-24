// app/api/diagnosis/links/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "";
    const schoolId = searchParams.get("schoolId") ?? "";
    const resultId = searchParams.get("resultId") ?? "";

    // ✅ GETは常に200 + 配列
    if (!schoolId || !resultId)
      return NextResponse.json([] as string[], { status: 200 });

    // -------------------------
    // ✅ 結果×ジャンル（返すのは genre.id 配列）
    // -------------------------
    if (type === "genres") {
      const result = await prisma.diagnosisResult.findFirst({
        where: { id: resultId, schoolId },
        select: {
          genres: { where: { isActive: true }, select: { id: true } },
        },
      });
      return NextResponse.json(
        result ? result.genres.map((g) => g.id) : ([] as string[]),
        {
          status: 200,
        }
      );
    }

    // -------------------------
    // ✅ 結果×校舎（返すのは campus.id 配列）
    // -------------------------
    if (type === "campuses") {
      const result = await prisma.diagnosisResult.findFirst({
        where: { id: resultId, schoolId },
        select: {
          campuses: { where: { isActive: true }, select: { id: true } },
        },
      });
      return NextResponse.json(
        result ? result.campuses.map((c) => c.id) : ([] as string[]),
        {
          status: 200,
        }
      );
    }

    return NextResponse.json([] as string[], { status: 200 });
  } catch (e: any) {
    console.error("[GET /api/diagnosis/links] error", e);
    return NextResponse.json([] as string[], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const type: string = body?.type ?? ""; // 👈 追加（genres / campuses）
    const schoolId: string = body?.schoolId ?? "";
    const resultId: string = body?.resultId ?? "";

    if (!schoolId || !resultId) {
      return NextResponse.json(
        { ok: false, message: "schoolId / resultId は必須です" },
        { status: 400 }
      );
    }

    // ✅ 念のため：そのschoolの結果か確認
    const owned = await prisma.diagnosisResult.findFirst({
      where: { id: resultId, schoolId },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "指定された結果が見つかりません（schoolId / resultId を確認）",
        },
        { status: 404 }
      );
    }

    // -------------------------
    // ✅ ジャンル紐づけ（genreIds or genreSlugs）
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

      return NextResponse.json({ ok: true, type, updated });
    }

    // -------------------------
    // ✅ 校舎紐づけ（campusIds or campusSlugs）
    // -------------------------
    if (type === "campuses") {
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
        include: {
          campuses: { select: { id: true, slug: true, label: true } },
        },
      });

      return NextResponse.json({ ok: true, type, updated });
    }

    return NextResponse.json(
      { ok: false, message: "unknown type" },
      { status: 400 }
    );
  } catch (e: any) {
    console.error("[POST /api/diagnosis/links] error", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "紐づけの更新に失敗しました" },
      { status: 500 }
    );
  }
}
