// app/api/diagnosis/genres/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  const id = body?.id;
  const schoolId = body?.schoolId;
  const label = body?.label;
  const slug = body?.slug;

  const answerTag = body?.answerTag ?? null; // ✅ 追加（null許容）
  const sortOrder = body?.sortOrder ?? 1;
  const isActive = body?.isActive ?? true;

  if (!id || !schoolId || !label || !slug) {
    return NextResponse.json(
      { message: "id / schoolId / label / slug は必須です" },
      { status: 400 }
    );
  }

  const row = await prisma.diagnosisGenre.create({
    data: { id, schoolId, label, slug, answerTag, sortOrder, isActive },
  });

  return NextResponse.json(row, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const id = body?.id;
  const schoolId = body?.schoolId;

  const label = body?.label;
  const slug = body?.slug;
  const answerTag = body?.answerTag; // ✅ 追加
  const sortOrder = body?.sortOrder;
  const isActive = body?.isActive;

  if (!id || !schoolId) {
    return NextResponse.json(
      { message: "id / schoolId は必須です" },
      { status: 400 }
    );
  }

  const row = await prisma.diagnosisGenre.update({
    where: { id }, // idがPKならこれでOK
    data: {
      ...(label !== undefined ? { label } : {}),
      ...(slug !== undefined ? { slug } : {}),
      // ✅ answerTag は「空文字なら null」に寄せる（管理画面のselect対策）
      ...(answerTag !== undefined
        ? {
            answerTag: String(answerTag).trim()
              ? String(answerTag).trim()
              : null,
          }
        : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  const schoolId = searchParams.get("schoolId") ?? "";

  if (!id || !schoolId) {
    return NextResponse.json(
      { message: "id / schoolId は必須です" },
      { status: 400 }
    );
  }

  // ✅ 「無効化」仕様に合わせて isActive=false
  const row = await prisma.diagnosisGenre.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json(row);
}
