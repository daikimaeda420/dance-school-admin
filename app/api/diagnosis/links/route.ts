import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const runtime = "nodejs";

async function ensureLoggedIn() {
  const session = await getServerSession(authOptions);
  return session?.user?.email ? session : null;
}

function json(message: string, status = 400, extra?: any) {
  return NextResponse.json({ message, ...extra }, { status });
}

/**
 * PUT /api/diagnosis/links
 * body: { schoolId: string, resultId: string, genreIds: string[] }
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const body = await req.json().catch(() => null);
    const schoolId = String(body?.schoolId ?? "").trim();
    const resultId = String(body?.resultId ?? "").trim();
    const genreIds = Array.isArray(body?.genreIds)
      ? body.genreIds.map((x: any) => String(x).trim()).filter(Boolean)
      : [];

    if (!schoolId || !resultId)
      return json("schoolId / resultId が必要です", 400);

    // ✅ Result がその schoolId に存在するか
    const result = await prisma.diagnosisResult.findFirst({
      where: { id: resultId, schoolId },
      select: { id: true },
    });
    if (!result) return json("DiagnosisResult が見つかりません", 404);

    // ✅ Genre も同じ schoolId のものだけに絞る（他校のID混入でFK/論理破綻を防ぐ）
    const validGenres = await prisma.diagnosisGenre.findMany({
      where: { schoolId, id: { in: genreIds } },
      select: { id: true },
    });
    const validGenreIds = validGenres.map((g) => g.id);

    // ✅ ここが重要：setで全解除 → connectで付け直し
    const updated = await prisma.diagnosisResult.update({
      where: { id: resultId },
      data: {
        genres: {
          set: [],
          connect: validGenreIds.map((id) => ({ id })),
        },
      },
      select: { id: true },
    });

    return NextResponse.json({
      ok: true,
      resultId: updated.id,
      linkedGenreIds: validGenreIds,
    });
  } catch (e: any) {
    console.error(e);
    return json(e?.message ?? "紐づけ更新に失敗しました", 500);
  }
}
