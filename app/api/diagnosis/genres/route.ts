// app/api/diagnosis/genres/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeAnswerTag(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId") ?? "";
  if (!schoolId) return NextResponse.json([], { status: 200 });

  const rows = await prisma.diagnosisGenre.findMany({
    where: { schoolId, isActive: true },
    orderBy: { sortOrder: "asc" },
    // ✅ 管理画面用に answerTag も返す
    select: {
      id: true,
      schoolId: true,
      label: true,
      slug: true,
      answerTag: true,
      sortOrder: true,
      isActive: true,
    },
  });

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const id = String(body?.id ?? "").trim();
  const schoolId = String(body?.schoolId ?? "").trim();
  const label = String(body?.label ?? "").trim();
  const slug = String(body?.slug ?? "").trim();

  const answerTag = normalizeAnswerTag(body?.answerTag);
  const sortOrder = Number(body?.sortOrder ?? 1);
  const isActive = Boolean(body?.isActive ?? true);

  if (!id || !schoolId || !label || !slug) {
    return NextResponse.json(
      { message: "id / schoolId / label / slug は必須です" },
      { status: 400 }
    );
  }

  try {
    const row = await prisma.diagnosisGenre.create({
      data: { id, schoolId, label, slug, answerTag, sortOrder, isActive },
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    // Prisma Unique constraint violation
    if (e?.code === "P2002") {
      return NextResponse.json(
        {
          message:
            "すでに同じ id または slug が存在します（id/slug を変更してください）。",
        },
        { status: 400 }
      );
    }
    console.error(e);
    return NextResponse.json(
      { message: "作成に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const id = String(body?.id ?? "").trim();
  const schoolId = String(body?.schoolId ?? "").trim();

  const label =
    body?.label !== undefined ? String(body.label).trim() : undefined;
  const slug = body?.slug !== undefined ? String(body.slug).trim() : undefined;
  const answerTag =
    body?.answerTag !== undefined
      ? normalizeAnswerTag(body.answerTag)
      : undefined;
  const sortOrder =
    body?.sortOrder !== undefined ? Number(body.sortOrder) : undefined;
  const isActive =
    body?.isActive !== undefined ? Boolean(body.isActive) : undefined;

  if (!id || !schoolId) {
    return NextResponse.json(
      { message: "id / schoolId は必須です" },
      { status: 400 }
    );
  }

  // ✅ id はグローバルPKでも、schoolId一致を必ず確認してから更新
  const exists = await prisma.diagnosisGenre.findFirst({
    where: { id, schoolId },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json(
      {
        message:
          "対象のジャンルが見つかりません（schoolId を確認してください）。",
      },
      { status: 404 }
    );
  }

  try {
    const row = await prisma.diagnosisGenre.update({
      where: { id },
      data: {
        ...(label !== undefined ? { label } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(answerTag !== undefined ? { answerTag } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return NextResponse.json(row);
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json(
        {
          message: "同じ slug がすでに存在します（slug を変更してください）。",
        },
        { status: 400 }
      );
    }
    console.error(e);
    return NextResponse.json(
      { message: "更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = String(searchParams.get("id") ?? "").trim();
  const schoolId = String(searchParams.get("schoolId") ?? "").trim();

  if (!id || !schoolId) {
    return NextResponse.json(
      { message: "id / schoolId は必須です" },
      { status: 400 }
    );
  }

  // ✅ schoolId一致を確認してから isActive=false
  const exists = await prisma.diagnosisGenre.findFirst({
    where: { id, schoolId },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json(
      {
        message:
          "対象のジャンルが見つかりません（schoolId を確認してください）。",
      },
      { status: 404 }
    );
  }

  const row = await prisma.diagnosisGenre.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json(row);
}
