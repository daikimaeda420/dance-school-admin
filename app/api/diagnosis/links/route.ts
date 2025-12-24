// app/api/diagnosis/links/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") ?? "") as "genres" | "campuses";
    const schoolId = searchParams.get("schoolId") ?? "";
    const resultId = searchParams.get("resultId") ?? "";
    const debug = searchParams.get("debug") === "1";

    if (!schoolId || !resultId) {
      return NextResponse.json(
        debug
          ? {
              ok: true,
              reason: "missing schoolId/resultId",
              type,
              schoolId,
              resultId,
            }
          : ([] as string[]),
        { status: 200 }
      );
    }
    if (type !== "genres" && type !== "campuses") {
      return NextResponse.json(
        debug
          ? { ok: true, reason: "bad type", type, schoolId, resultId }
          : ([] as string[]),
        { status: 200 }
      );
    }

    // ✅ campuses は id/slug 両方取って状況確認できるようにする（最重要）
    const result = await prisma.diagnosisResult.findFirst({
      where: { id: resultId, schoolId },
      select:
        type === "genres"
          ? { genres: { select: { id: true, slug: true, isActive: true } } }
          : { campuses: { select: { id: true, slug: true, isActive: true } } },
    });

    if (!result) {
      return NextResponse.json(
        debug
          ? { ok: true, reason: "result not found", type, schoolId, resultId }
          : ([] as string[]),
        { status: 200 }
      );
    }

    if (type === "genres") {
      const items = (result as any).genres as Array<{
        id: string;
        slug: string | null;
        isActive: boolean;
      }>;
      const ids = items.filter((x) => x.isActive).map((x) => x.id);
      return NextResponse.json(
        debug
          ? { ok: true, type, schoolId, resultId, count: ids.length, items }
          : ids,
        { status: 200 }
      );
    }

    // campuses
    const items = (result as any).campuses as Array<{
      id: string;
      slug: string | null;
      isActive: boolean;
    }>;
    // ✅ 本番返却は「slug優先、無ければid」にしてUIとズレないようにする
    const keys = items.filter((x) => x.isActive).map((x) => x.slug ?? x.id);

    return NextResponse.json(
      debug
        ? {
            ok: true,
            type,
            schoolId,
            resultId,
            count: keys.length,
            items,
            returned: keys,
          }
        : keys,
      { status: 200 }
    );
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
