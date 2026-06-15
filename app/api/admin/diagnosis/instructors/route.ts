// app/api/diagnosis/instructors/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/authz";

export const runtime = "nodejs";

// GET /api/diagnosis/instructors?schoolId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId")?.trim();

  if (!schoolId) {
    return NextResponse.json(
      { message: "schoolId が必要です" },
      { status: 400 }
    );
  }

  const auth = await requireSchoolAccess(schoolId);
  if (!auth.ok) return auth.response;

  const rows = await prisma.diagnosisInstructor.findMany({
    where: { schoolId },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(rows);
}

// POST /api/diagnosis/instructors
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (
    !body ||
    typeof body.id !== "string" ||
    typeof body.schoolId !== "string" ||
    typeof body.label !== "string" ||
    typeof body.slug !== "string"
  ) {
    return NextResponse.json(
      { message: "id / schoolId / label / slug は必須です" },
      { status: 400 }
    );
  }

  const schoolId = body.schoolId.trim();
  const auth = await requireSchoolAccess(schoolId);
  if (!auth.ok) return auth.response;

  const sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : 0;
  const isActive = body.isActive !== false;

  const created = await prisma.diagnosisInstructor.create({
    data: {
      id: body.id.trim(),
      schoolId,
      label: body.label.trim(),
      slug: body.slug.trim(),
      sortOrder,
      isActive,
    },
  });

  return NextResponse.json(created, { status: 201 });
}

// PUT /api/diagnosis/instructors
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (
    !body ||
    typeof body.id !== "string" ||
    typeof body.schoolId !== "string" ||
    typeof body.label !== "string" ||
    typeof body.slug !== "string"
  ) {
    return NextResponse.json(
      { message: "id / schoolId / label / slug は必須です" },
      { status: 400 }
    );
  }

  const sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : 0;
  const isActive = body.isActive !== false;
  const schoolId = body.schoolId.trim();

  const auth = await requireSchoolAccess(schoolId);
  if (!auth.ok) return auth.response;

  const existing = await prisma.diagnosisInstructor.findFirst({
    where: {
      id: body.id.trim(),
      schoolId,
    },
  });

  if (!existing) {
    return NextResponse.json(
      { message: "対象が見つかりません" },
      { status: 404 }
    );
  }

  const updated = await prisma.diagnosisInstructor.update({
    where: { id: existing.id },
    data: {
      label: body.label.trim(),
      slug: body.slug.trim(),
      sortOrder,
      isActive,
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/diagnosis/instructors?id=xxx&schoolId=yyy（論理削除）
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim();
  const schoolId = searchParams.get("schoolId")?.trim();

  if (!id || !schoolId) {
    return NextResponse.json(
      { message: "id / schoolId が必要です" },
      { status: 400 }
    );
  }

  const auth = await requireSchoolAccess(schoolId);
  if (!auth.ok) return auth.response;

  const existing = await prisma.diagnosisInstructor.findFirst({
    where: { id, schoolId },
  });

  if (!existing) {
    return NextResponse.json(
      { message: "対象が見つかりません" },
      { status: 404 }
    );
  }

  const updated = await prisma.diagnosisInstructor.update({
    where: { id: existing.id },
    data: { isActive: false },
  });

  return NextResponse.json(updated);
}
