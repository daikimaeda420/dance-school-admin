// app/api/admin/diagnosis/campuses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const runtime = "nodejs";

async function ensureLoggedIn() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return session;
}

function norm(v: unknown): string {
  return String(v ?? "").trim();
}
function toNum(v: any, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function toBool(v: any, fallback = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true";
  return fallback;
}

// PATCH /api/admin/diagnosis/campuses/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await ensureLoggedIn();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const id = norm(params.id);
  const body = await req.json().catch(() => null);

  if (!id) {
    return NextResponse.json({ message: "id が必要です" }, { status: 400 });
  }
  if (!body) {
    return NextResponse.json(
      { message: "更新データがありません" },
      { status: 400 }
    );
  }

  const schoolId = norm(body.schoolId ?? body.school);
  if (!schoolId) {
    return NextResponse.json(
      { message: "schoolId（または school）が必要です" },
      { status: 400 }
    );
  }

  const existing = await prisma.diagnosisCampus.findFirst({
    where: { id, schoolId },
    select: { id: true, slug: true },
  });
  if (!existing) {
    return NextResponse.json(
      { message: "対象の校舎が見つかりません" },
      { status: 404 }
    );
  }

  const data: any = {};

  if (typeof body.label === "string") data.label = norm(body.label);

  if (body.slug !== undefined) {
    const nextSlug = norm(body.slug);
    if (!nextSlug) {
      return NextResponse.json(
        { message: "slug は空にできません" },
        { status: 400 }
      );
    }
    if (nextSlug !== existing.slug) {
      const dup = await prisma.diagnosisCampus.findFirst({
        where: { schoolId, slug: nextSlug },
        select: { id: true },
      });
      if (dup) {
        return NextResponse.json(
          { message: "このslugは既に使われています（重複）。" },
          { status: 409 }
        );
      }
    }
    data.slug = nextSlug;
  }

  if (body.sortOrder !== undefined) data.sortOrder = toNum(body.sortOrder, 0);
  if (body.isActive !== undefined) data.isActive = toBool(body.isActive, true);

  if (body.address !== undefined) {
    if (body.address === null) data.address = null;
    else if (typeof body.address === "string")
      data.address = norm(body.address) || null;
  }
  if (body.access !== undefined) {
    if (body.access === null) data.access = null;
    else if (typeof body.access === "string")
      data.access = norm(body.access) || null;
  }
  if (body.googleMapUrl !== undefined) {
    if (body.googleMapUrl === null) data.googleMapUrl = null;
    else if (typeof body.googleMapUrl === "string")
      data.googleMapUrl = norm(body.googleMapUrl) || null;
  }

  // ✅ 追加：googleMapEmbedUrl（互換で mapEmbedUrl も受ける）
  if (body.googleMapEmbedUrl !== undefined || body.mapEmbedUrl !== undefined) {
    const v =
      body.googleMapEmbedUrl !== undefined
        ? body.googleMapEmbedUrl
        : body.mapEmbedUrl;

    if (v === null) data.googleMapEmbedUrl = null;
    else if (typeof v === "string") data.googleMapEmbedUrl = norm(v) || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { message: "更新できる項目がありません" },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.diagnosisCampus.update({
      where: { id },
      data,
      select: {
        id: true,
        schoolId: true,
        label: true,
        slug: true,
        sortOrder: true,
        isActive: true,
        address: true,
        access: true,
        googleMapUrl: true,
        // ✅ 追加：iframe 用
        googleMapEmbedUrl: true,
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    const code = e?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { message: "このslugは既に使われています（重複）。" },
        { status: 409 }
      );
    }
    if (code === "P2022") {
      return NextResponse.json(
        {
          message:
            "DBに必要なカラムが見つかりません（migration未適用の可能性）。",
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { message: e?.message || "更新に失敗しました。" },
      { status: 500 }
    );
  }
}

// DELETE はそのままでOK（貼ってくれた既存のままで問題なし）
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await ensureLoggedIn();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const id = norm(params.id);
  const { searchParams } = new URL(req.url);
  const schoolId = norm(
    searchParams.get("schoolId") ?? searchParams.get("school")
  );

  if (!id) {
    return NextResponse.json({ message: "id が必要です" }, { status: 400 });
  }
  if (!schoolId) {
    return NextResponse.json(
      { message: "schoolId（または school）が必要です" },
      { status: 400 }
    );
  }

  const existing = await prisma.diagnosisCampus.findFirst({
    where: { id, schoolId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json(
      { message: "対象の校舎が見つかりません" },
      { status: 404 }
    );
  }

  try {
    await prisma.diagnosisCampus.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      {
        message:
          "削除に失敗しました（関連データが存在する可能性があります）。isActive=false の論理削除運用をご検討ください。",
        detail: e?.message ?? null,
      },
      { status: 400 }
    );
  }
}
