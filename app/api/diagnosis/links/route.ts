import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const runtime = "nodejs";

async function ensureLoggedIn() {
  const session = await getServerSession(authOptions);
  return session?.user?.email ? session : null;
}

function ok(data: any) {
  return NextResponse.json({ ok: true, ...data });
}
function ng(message: string, status = 400, extra?: any) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

type Body =
  | {
      schoolId: string;
      resultId: string;
      genreIds: string[]; // 一括置換
    }
  | {
      schoolId: string;
      resultId: string;
      genreId: string; // トグル
      checked: boolean;
    };

async function handle(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session) return ng("Unauthorized", 401);

  const body = (await req.json().catch(() => null)) as Partial<Body> | null;
  const schoolId = String((body as any)?.schoolId ?? "").trim();
  const resultId = String((body as any)?.resultId ?? "").trim();

  if (!schoolId || !resultId) {
    return ng("schoolId / resultId が必要です", 400);
  }

  // ✅ Result がこの schoolId に存在するか
  const result = await prisma.diagnosisResult.findFirst({
    where: { id: resultId, schoolId },
    select: { id: true },
  });
  if (!result) return ng("DiagnosisResult が見つかりません", 404);

  // --- A) 一括置換 { genreIds: [] } ---
  if (Array.isArray((body as any)?.genreIds)) {
    const genreIds = (body as any).genreIds
      .map((x: any) => String(x).trim())
      .filter(Boolean);

    // ✅ 同一schoolIdのGenreだけ採用
    const valid = await prisma.diagnosisGenre.findMany({
      where: { schoolId, id: { in: genreIds } },
      select: { id: true },
    });
    const validIds = valid.map((g) => g.id);

    // ✅ set -> connect で置換
    await prisma.diagnosisResult.update({
      where: { id: resultId },
      data: {
        genres: {
          set: [],
          connect: validIds.map((id) => ({ id })),
        },
      },
      select: { id: true },
    });

    return ok({ mode: "replace", resultId, linkedGenreIds: validIds });
  }

  // --- B) トグル { genreId, checked } ---
  const genreId = String((body as any)?.genreId ?? "").trim();
  const checked = Boolean((body as any)?.checked);

  if (!genreId) return ng("genreId が必要です", 400);

  // ✅ Genre がこの schoolId に存在するか
  const genre = await prisma.diagnosisGenre.findFirst({
    where: { id: genreId, schoolId },
    select: { id: true },
  });
  if (!genre) return ng("DiagnosisGenre が見つかりません", 404);

  await prisma.diagnosisResult.update({
    where: { id: resultId },
    data: {
      genres: checked
        ? { connect: { id: genreId } }
        : { disconnect: { id: genreId } },
    },
    select: { id: true },
  });

  return ok({ mode: "toggle", resultId, genreId, checked });
}

export async function POST(req: NextRequest) {
  try {
    return await handle(req);
  } catch (e: any) {
    console.error("links POST error:", e);
    return ng(e?.message ?? "紐づけ更新に失敗しました", 500, {
      detail: String(e?.meta?.cause ?? ""),
    });
  }
}

export async function PUT(req: NextRequest) {
  try {
    return await handle(req);
  } catch (e: any) {
    console.error("links PUT error:", e);
    return ng(e?.message ?? "紐づけ更新に失敗しました", 500, {
      detail: String(e?.meta?.cause ?? ""),
    });
  }
}
