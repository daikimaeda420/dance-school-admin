// app/api/diagnosis/genres/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId") ?? "";
    if (!schoolId) return NextResponse.json([], { status: 200 });

    const rows = await prisma.diagnosisGenre.findMany({
      where: { schoolId, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        schoolId: true,
        label: true,
        slug: true,
        sortOrder: true,
        isActive: true,
      },
    });

    return NextResponse.json(rows);
  } catch (e) {
    console.error("[GET /api/diagnosis/genres] error", e);
    return NextResponse.json(
      { message: "genres の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
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
  } catch (e) {
    console.error("[POST /api/diagnosis/genres] error", e);
    return NextResponse.json(
      { message: "作成に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
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

    const row = await prisma.diagnosisGenre.update({
      where: { id },
      data: {
        ...(label !== undefined ? { label } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return NextResponse.json(row);
  } catch (e) {
    console.error("[PUT /api/diagnosis/genres] error", e);
    return NextResponse.json(
      { message: "更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") ?? "";
    const schoolId = searchParams.get("schoolId") ?? "";

    if (!id || !schoolId) {
      return NextResponse.json(
        { message: "id / schoolId は必須です" },
        { status: 400 }
      );
    }

    const row = await prisma.diagnosisGenre.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json(row);
  } catch (e) {
    console.error("[DELETE /api/diagnosis/genres] error", e);
    return NextResponse.json(
      { message: "無効化に失敗しました" },
      { status: 500 }
    );
  }
}
