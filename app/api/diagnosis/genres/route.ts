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
    select: { id: true, label: true, slug: true },
  });

  // Embed側は {id,label} だけでも動くが、管理画面用にslugも返してOK
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = body?.id;
  const schoolId = body?.schoolId;
  const label = body?.label;
  const slug = body?.slug;
  const sortOrder = body?.sortOrder ?? 1;
  const isActive = body?.isActive ?? true;

  if (!id || !schoolId || !label || !slug) {
    return NextResponse.json(
      { message: "id / schoolId / label / slug は必須です" },
      { status: 400 }
    );
  }

  const row = await prisma.diagnosisGenre.create({
    data: { id, schoolId, label, slug, sortOrder, isActive },
  });

  return NextResponse.json(row, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = body?.id;
  const schoolId = body?.schoolId;
  const label = body?.label;
  const slug = body?.slug;
  const sortOrder = body?.sortOrder;
  const isActive = body?.isActive;

  if (!id || !schoolId) {
    return NextResponse.json(
      { message: "id / schoolId は必須です" },
      { status: 400 }
    );
  }

  // slug が必須カラムなら、更新時に undefined にしない
  const row = await prisma.diagnosisGenre.update({
    where: { id }, // ← もし複合Uniqueならここを合わせる（idがPKならこれでOK）
    data: {
      ...(label !== undefined ? { label } : {}),
      ...(slug !== undefined ? { slug } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  return NextResponse.json(row);
}
