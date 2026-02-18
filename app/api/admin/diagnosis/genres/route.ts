// app/api/admin/diagnosis/genres/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const runtime = "nodejs";

async function ensureLoggedIn() {
  const session = await getServerSession(authOptions);
  return session?.user?.email ? session : null;
}

function json(message: string, status = 400, extra?: Record<string, any>) {
  return NextResponse.json({ message, ...(extra ?? {}) }, { status });
}

const DEFAULTS: Array<{ label: string; slug: string; sortOrder: number }> = [
  { label: "K-POP", slug: "Genre_Kpop", sortOrder: 10 },
  { label: "HIPHOP", slug: "Genre_Hiphop", sortOrder: 20 },
  { label: "ジャズダンス", slug: "Genre_Jazz", sortOrder: 30 },
  { label: "アイドルダンス", slug: "Genre_Idol", sortOrder: 40 },
  { label: "特になし・わからない", slug: "Genre_None", sortOrder: 50 },
];

async function ensureDefaults(schoolId: string) {
  const existing = await prisma.diagnosisGenre.findMany({ where: { schoolId } });
  
  // レコードが0件の場合 → デフォルト投入
  if (existing.length === 0) {
    await prisma.diagnosisGenre.createMany({
      data: DEFAULTS.map((d) => ({
        schoolId,
        label: d.label,
        slug: d.slug,
        sortOrder: d.sortOrder,
        isActive: true,
      })),
    });
    return;
  }

  // 正しい Genre_XXX 形式の slug が1件でもあればスキップ
  const hasProperSlugs = existing.some((g) => g.slug.startsWith("Genre_"));
  if (hasProperSlugs) return;

  // レガシーデータのみ → 古いデータを削除してデフォルトを投入
  console.log(`[ensureDefaults] レガシージャンルを検出 (${existing.length}件)。デフォルトに置換します。`);
  await prisma.diagnosisGenre.deleteMany({ where: { schoolId } });
  await prisma.diagnosisGenre.createMany({
    data: DEFAULTS.map((d) => ({
      schoolId,
      label: d.label,
      slug: d.slug,
      sortOrder: d.sortOrder,
      isActive: true,
    })),
  });
}

// GET /api/admin/diagnosis/genres?schoolId=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");
    if (!schoolId) return json("schoolId が必要です", 400);

    await ensureDefaults(schoolId);

    const rows = await prisma.diagnosisGenre.findMany({
      where: { schoolId },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });

    return NextResponse.json({ genres: rows });
  } catch (e: any) {
    return json("genres取得でエラー", 500, {
      detail: e?.message ?? String(e),
      name: e?.name,
      code: e?.code,
      meta: e?.meta,
    });
  }
}

// POST /api/admin/diagnosis/genres
export async function POST(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const body = await req.json().catch(() => null);
    if (!body?.schoolId) return json("schoolId が必要です", 400);
    if (!body?.label) return json("label が必要です", 400);

    const schoolId = String(body.schoolId);
    const label = String(body.label).trim();

    // slugは Genre_XXX 形式を推奨するが、通常のフォーマットでもOK
    const slug = String(body.slug ?? "")
      .trim()
      .replace(/\s+/g, "-");

    if (!slug) return json("slug が必要です（空は不可）", 400);

    const sortOrder = Number.isFinite(Number(body.sortOrder))
      ? Number(body.sortOrder)
      : 0;

    const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

    const created = await prisma.diagnosisGenre.create({
      data: { schoolId, label, slug, sortOrder, isActive },
    });

    return NextResponse.json({ genre: created });
  } catch (e: any) {
    return json("追加に失敗しました（slug重複の可能性）", 400, {
      detail: e?.message ?? String(e),
    });
  }
}

// PATCH /api/admin/diagnosis/genres
export async function PATCH(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const body = await req.json().catch(() => null);
    if (!body?.id) return json("id が必要です", 400);

    const id = String(body.id);
    const data: Record<string, any> = {};

    if (body.label != null) data.label = String(body.label).trim();
    if (body.slug != null)
      data.slug = String(body.slug).trim().replace(/\s+/g, "-");
    if (body.sortOrder != null && Number.isFinite(Number(body.sortOrder)))
      data.sortOrder = Number(body.sortOrder);
    if (body.isActive != null) data.isActive = Boolean(body.isActive);

    const updated = await prisma.diagnosisGenre.update({
      where: { id },
      data,
    });

    return NextResponse.json({ genre: updated });
  } catch (e: any) {
    return json("更新に失敗しました", 400, {
      detail: e?.message ?? String(e),
    });
  }
}

// DELETE /api/admin/diagnosis/genres
export async function DELETE(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const body = await req.json().catch(() => null);
    if (!body?.id) return json("id が必要です", 400);

    await prisma.diagnosisGenre.delete({ where: { id: String(body.id) } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return json("削除に失敗しました", 400, {
      detail: e?.message ?? String(e),
    });
  }
}
