// app/api/diagnosis/genres/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const runtime = "nodejs";

async function ensureLoggedIn() {
  const session = await getServerSession(authOptions);
  return session?.user?.email ? session : null;
}

function json(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

function toBool(v: any, fallback: boolean) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true";
  return fallback;
}

function toNum(v: any, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * GET /api/diagnosis/genres?schoolId=xxx
 */
export async function GET(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session) return json("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId")?.trim();
  const includeInactive = searchParams.get("includeInactive") === "true";

  if (!schoolId) return json("schoolId が必要です", 400);

  const rows = await prisma.diagnosisGenre.findMany({
    where: {
      schoolId,
      ...(includeInactive ? {} : { isActive: true }), // ←ここがポイント
    },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });

  return NextResponse.json(rows);
}

/**
 * POST /api/diagnosis/genres
 * body: { id, schoolId, label, slug, answerTag?, sortOrder?, isActive? }
 */
export async function POST(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session) return json("Unauthorized", 401);

  const body = (await req.json().catch(() => null)) as any;
  if (!body) return json("JSON が不正です", 400);

  const id = String(body.id ?? "").trim();
  const schoolId = String(body.schoolId ?? "").trim();
  const label = String(body.label ?? "").trim();
  const slug = String(body.slug ?? "").trim();
  const answerTagRaw = body.answerTag ?? null;
  const answerTag =
    answerTagRaw === null || answerTagRaw === undefined
      ? null
      : String(answerTagRaw).trim() || null;

  const sortOrder = toNum(body.sortOrder, 1);
  const isActive = toBool(body.isActive, true);

  if (!id || !schoolId || !label || !slug) {
    return json("id / schoolId / label / slug は必須です", 400);
  }

  try {
    const created = await prisma.diagnosisGenre.create({
      data: {
        id,
        schoolId,
        label,
        slug,
        answerTag,
        sortOrder,
        isActive,
      },
    });
    return NextResponse.json(created);
  } catch (e: any) {
    // Prisma unique error等
    return json(e?.message ?? "作成に失敗しました", 400);
  }
}

/**
 * PUT /api/diagnosis/genres
 * body: { id, schoolId, label, slug, answerTag?, sortOrder?, isActive? }
 */
export async function PUT(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session) return json("Unauthorized", 401);

  const body = (await req.json().catch(() => null)) as any;
  if (!body) return json("JSON が不正です", 400);

  const id = String(body.id ?? "").trim();
  const schoolId = String(body.schoolId ?? "").trim();
  const label = String(body.label ?? "").trim();
  const slug = String(body.slug ?? "").trim();
  const answerTagRaw = body.answerTag ?? null;
  const answerTag =
    answerTagRaw === null || answerTagRaw === undefined
      ? null
      : String(answerTagRaw).trim() || null;

  const sortOrder = toNum(body.sortOrder, 1);
  const isActive = toBool(body.isActive, true);

  if (!id || !schoolId) return json("id / schoolId が必要です", 400);
  if (!label || !slug) return json("label / slug は必須です", 400);

  // 念のため schoolId も一致するものだけ更新したい場合：
  const exists = await prisma.diagnosisGenre.findFirst({
    where: { id, schoolId },
  });
  if (!exists) return json("対象データが見つかりません", 404);

  try {
    const updated = await prisma.diagnosisGenre.update({
      where: { id },
      data: {
        label,
        slug,
        answerTag,
        sortOrder,
        isActive,
      },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    return json(e?.message ?? "更新に失敗しました", 400);
  }
}

/**
 * DELETE /api/diagnosis/genres?id=xxx&schoolId=xxx&hard=true|false
 * - hard=true : 物理削除
 * - hard!=true: 休校(論理削除) => isActive=false
 */
export async function DELETE(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session) return json("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim();
  const schoolId = searchParams.get("schoolId")?.trim();
  const hard = searchParams.get("hard") === "true";

  if (!id || !schoolId) return json("id / schoolId が必要です", 400);

  const exists = await prisma.diagnosisGenre.findFirst({
    where: { id, schoolId },
  });
  if (!exists) return json("対象データが見つかりません", 404);

  try {
    if (hard) {
      await prisma.diagnosisGenre.delete({ where: { id } });
      return NextResponse.json({ ok: true, mode: "hard" });
    } else {
      await prisma.diagnosisGenre.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ ok: true, mode: "soft" });
    }
  } catch (e: any) {
    return json(e?.message ?? "削除に失敗しました", 400);
  }
}
