// app/api/admin/diagnosis/lifestyles/route.ts
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
  { label: "未就学児（3歳〜6歳くらい）", slug: "preschool", sortOrder: 10 },
  { label: "小学生（キッズ）", slug: "elementary", sortOrder: 20 },
  { label: "中学生・高校生", slug: "junior-high-high", sortOrder: 30 },
  { label: "大学生・専門学生", slug: "college", sortOrder: 40 },
  { label: "社会人（お仕事をしている方）", slug: "worker", sortOrder: 50 },
  { label: "主婦・主夫（日中の時間を活用）", slug: "homemaker", sortOrder: 60 },
];

async function ensureDefaults(schoolId: string) {
  // 1件でもあれば何もしない
  const count = await prisma.diagnosisLifestyle.count({ where: { schoolId } });
  if (count > 0) return;

  await prisma.diagnosisLifestyle.createMany({
    data: DEFAULTS.map((d) => ({
      schoolId,
      label: d.label,
      slug: d.slug,
      sortOrder: d.sortOrder,
      isActive: true,
    })),
  });
}

// GET /api/admin/diagnosis/lifestyles?schoolId=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");
    if (!schoolId) return json("schoolId が必要です", 400);

    await ensureDefaults(schoolId);

    const rows = await prisma.diagnosisLifestyle.findMany({
      where: { schoolId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ lifestyles: rows });
  } catch (e: any) {
    // ここで detail を返しておくと原因特定が早い
    return json("lifestyles取得でエラー", 500, {
      detail: e?.message ?? String(e),
    });
  }
}

// POST /api/admin/diagnosis/lifestyles
// body: { schoolId, label, slug?, sortOrder?, isActive? }
export async function POST(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const body = await req.json().catch(() => null);
    if (!body?.schoolId) return json("schoolId が必要です", 400);
    if (!body?.label) return json("label が必要です", 400);

    const schoolId = String(body.schoolId);
    const label = String(body.label).trim();

    const slug = String(body.slug ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");

    if (!slug) return json("slug が必要です（空は不可）", 400);

    const sortOrder = Number.isFinite(Number(body.sortOrder))
      ? Number(body.sortOrder)
      : 0;

    const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

    const created = await prisma.diagnosisLifestyle.create({
      data: { schoolId, label, slug, sortOrder, isActive },
    });

    return NextResponse.json({ lifestyle: created });
  } catch (e: any) {
    // slug重複など Prisma の内容も返す（UI側の原因特定用）
    return json("追加に失敗しました（slug重複の可能性）", 400, {
      detail: e?.message ?? String(e),
    });
  }
}

// PATCH /api/admin/diagnosis/lifestyles
// body: { id, label?, slug?, sortOrder?, isActive? }
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
      data.slug = String(body.slug).trim().toLowerCase().replace(/\s+/g, "-");
    if (body.sortOrder != null && Number.isFinite(Number(body.sortOrder)))
      data.sortOrder = Number(body.sortOrder);
    if (body.isActive != null) data.isActive = Boolean(body.isActive);

    const updated = await prisma.diagnosisLifestyle.update({
      where: { id },
      data,
    });

    return NextResponse.json({ lifestyle: updated });
  } catch (e: any) {
    return json("更新に失敗しました", 400, {
      detail: e?.message ?? String(e),
    });
  }
}

// DELETE /api/admin/diagnosis/lifestyles
// body: { id }
export async function DELETE(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const body = await req.json().catch(() => null);
    if (!body?.id) return json("id が必要です", 400);

    await prisma.diagnosisLifestyle.delete({ where: { id: String(body.id) } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return json("削除に失敗しました", 400, {
      detail: e?.message ?? String(e),
    });
  }
}
