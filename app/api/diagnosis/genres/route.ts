// app/api/diagnosis/genres/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET（既存があるならそっちを残してOK）
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId") ?? "";
  if (!schoolId) return NextResponse.json([], { status: 200 });

  const rows = await prisma.diagnosisGenre.findMany({
    where: { schoolId, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, label: true }, // ←あなたの DiagnosisQuestionOption に合わせる
  });

  return NextResponse.json(rows);
}

// POST（管理画面から追加）
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { id, schoolId, label, sortOrder = 1, isActive = true } = body ?? {};

  if (!id || !schoolId || !label) {
    return NextResponse.json(
      { message: "id / schoolId / label は必須です" },
      { status: 400 }
    );
  }

  const row = await prisma.diagnosisGenre.create({
    data: { id, schoolId, label, sortOrder, isActive },
  });

  return NextResponse.json(row, { status: 201 });
}

// PUT（編集）
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, schoolId, label, sortOrder, isActive } = body ?? {};

  if (!id || !schoolId) {
    return NextResponse.json(
      { message: "id / schoolId は必須です" },
      { status: 400 }
    );
  }

  const row = await prisma.diagnosisGenre.update({
    where: { id_schoolId: { id, schoolId } }, // ←複合uniqueが無いなら where: { id } に変更
    data: { label, sortOrder, isActive },
  });

  return NextResponse.json(row);
}

// DELETE（削除 or 論理削除推奨）
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  const schoolId = searchParams.get("schoolId") ?? "";
  if (!id || !schoolId) {
    return NextResponse.json(
      { message: "id/schoolId required" },
      { status: 400 }
    );
  }

  // 論理削除が安全
  await prisma.diagnosisGenre.update({
    where: { id_schoolId: { id, schoolId } }, // 同上
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
