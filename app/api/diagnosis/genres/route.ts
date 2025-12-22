// app/api/diagnosis/genres/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Prismaのエラーコードをできるだけ人間向けに返す
function toMessage(e: any) {
  const code = e?.code;
  if (code === "P2002") return "同じ id または slug が既に存在します（重複）";
  if (code === "P2022")
    return "DBに存在しないカラムを参照しています（migrate漏れの可能性）";
  return e?.message ?? "サーバーエラーが発生しました";
}

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
        // answerTag がDBにあるなら返したいが、無くても落ちないように any 経由で拾う
        ...(undefined as any),
      } as any,
    });

    return NextResponse.json(rows);
  } catch (e: any) {
    console.error("[GET /api/diagnosis/genres] error", e);
    return NextResponse.json({ message: toMessage(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const id = String(body?.id ?? "").trim();
    const schoolId = String(body?.schoolId ?? "").trim();
    const label = String(body?.label ?? "").trim();
    const slug = String(body?.slug ?? "").trim();

    const sortOrder = Number(body?.sortOrder ?? 1);
    const isActive = Boolean(body?.isActive ?? true);

    // ここは任意（空ならnull）
    const answerTagRaw = body?.answerTag;
    const answerTag =
      typeof answerTagRaw === "string" && answerTagRaw.trim()
        ? answerTagRaw.trim()
        : null;

    if (!id || !schoolId || !label || !slug) {
      return NextResponse.json(
        { message: "id / schoolId / label / slug は必須です" },
        { status: 400 }
      );
    }

    const data: any = { id, schoolId, label, slug, sortOrder, isActive };
    // DBにanswerTagカラムが無い環境でも、ここで入れるとP2022になり得るので、
    // まずは「送られてきたら入れる」だけにして、エラー文を返せるようにする
    if (body?.answerTag !== undefined) data.answerTag = answerTag;

    const row = await (prisma.diagnosisGenre as any).create({ data });

    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/diagnosis/genres] error", e);
    // 重複は409で返す（フロントで分かりやすい）
    const status = e?.code === "P2002" ? 409 : 500;
    return NextResponse.json({ message: toMessage(e) }, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const id = String(body?.id ?? "").trim();
    const schoolId = String(body?.schoolId ?? "").trim();
    if (!id || !schoolId) {
      return NextResponse.json(
        { message: "id / schoolId は必須です" },
        { status: 400 }
      );
    }

    const patch: any = {};
    if (body?.label !== undefined) patch.label = String(body.label).trim();
    if (body?.slug !== undefined) patch.slug = String(body.slug).trim();
    if (body?.sortOrder !== undefined) patch.sortOrder = Number(body.sortOrder);
    if (body?.isActive !== undefined) patch.isActive = Boolean(body.isActive);

    if (body?.answerTag !== undefined) {
      const v = String(body.answerTag ?? "").trim();
      patch.answerTag = v ? v : null;
    }

    const row = await (prisma.diagnosisGenre as any).update({
      where: { id },
      data: patch,
    });

    return NextResponse.json(row);
  } catch (e: any) {
    console.error("[PUT /api/diagnosis/genres] error", e);
    return NextResponse.json({ message: toMessage(e) }, { status: 500 });
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
  } catch (e: any) {
    console.error("[DELETE /api/diagnosis/genres] error", e);
    return NextResponse.json({ message: toMessage(e) }, { status: 500 });
  }
}
