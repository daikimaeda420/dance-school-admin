// app/api/diagnosis/genres/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Prismaのエラーコードをできるだけ人間向けに返す
function toMessage(e: any) {
  const code = e?.code;
  if (code === "P2002") return "同じ id または slug が既に存在します（重複）";
  if (code === "P2022")
    return "DBに存在しないカラムを参照しています（migrate漏れの可能性）";
  if (code === "P2025") return "対象データが見つかりません";
  return e?.message ?? "サーバーエラーが発生しました";
}

function toBool(v: any, fallback: boolean) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true";
  return fallback;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = (searchParams.get("schoolId") ?? "").trim();
    const includeInactive = toBool(searchParams.get("includeInactive"), false);

    if (!schoolId) return NextResponse.json([], { status: 200 });

    const rows = await prisma.diagnosisGenre.findMany({
      where: {
        schoolId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      select: {
        id: true,
        schoolId: true,
        label: true,
        slug: true,
        answerTag: true,
        sortOrder: true,
        isActive: true,
        // ✅ 追加：画像があるかどうか判定できるように返す（Bytesは返さない）
        photoMime: true,
        updatedAt: true, // キャッシュバスターにも使える
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

    // 任意（空ならnull）
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
    if (body?.answerTag !== undefined) data.answerTag = answerTag;

    const row = await (prisma.diagnosisGenre as any).create({ data });

    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/diagnosis/genres] error", e);
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

    // 念のため対象が同じschoolIdか確認（他校のidを更新できないようにする）
    const exists = await prisma.diagnosisGenre.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json(
        { message: "対象のジャンルが見つかりません" },
        { status: 404 }
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
    const status = e?.code === "P2002" ? 409 : 500;
    return NextResponse.json({ message: toMessage(e) }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = (searchParams.get("id") ?? "").trim();
    const schoolId = (searchParams.get("schoolId") ?? "").trim();
    const hard = toBool(searchParams.get("hard"), false);

    if (!id || !schoolId) {
      return NextResponse.json(
        { message: "id / schoolId は必須です" },
        { status: 400 }
      );
    }

    // 他校のidを操作できないように確認
    const exists = await prisma.diagnosisGenre.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json(
        { message: "対象のジャンルが見つかりません" },
        { status: 404 }
      );
    }

    if (hard) {
      // ✅ 物理削除（GenreAdminClient が hard=true で呼ぶ想定）
      const row = await prisma.diagnosisGenre.delete({ where: { id } });
      return NextResponse.json(row);
    }

    // ✅ 論理削除（isActive=false）
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
