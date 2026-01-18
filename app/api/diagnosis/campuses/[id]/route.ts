// app/api/diagnosis/campuses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const runtime = "nodejs";

function norm(v: unknown) {
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

async function ensureLoggedIn() {
  const session = await getServerSession(authOptions);
  return session?.user?.email ? session : null;
}

function addAliases<
  T extends { mapEmbedUrl?: string | null; mapLinkUrl?: string | null }
>(row: T) {
  return {
    ...row,
    googleMapEmbedUrl: row.mapEmbedUrl ?? null,
    googleMapLinkUrl: row.mapLinkUrl ?? null,
  };
}

// PATCH /api/diagnosis/campuses/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await ensureLoggedIn();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const id = norm(params.id);
  if (!id) {
    return NextResponse.json({ message: "id が必要です" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as any));

  // 後方互換：schoolId / school
  const schoolId = norm(body.schoolId ?? body.school);
  if (!schoolId) {
    return NextResponse.json(
      { message: "schoolId が必要です" },
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

  const label = body.label !== undefined ? norm(body.label) : undefined;
  const slug = body.slug !== undefined ? norm(body.slug) : undefined;

  const sortOrder =
    body.sortOrder !== undefined ? toNum(body.sortOrder, 0) : undefined;
  const isActive =
    body.isActive !== undefined ? toBool(body.isActive, true) : undefined;

  const address =
    body.address !== undefined ? norm(body.address) || null : undefined;
  const access =
    body.access !== undefined ? norm(body.access) || null : undefined;

  const googleMapUrl =
    body.googleMapUrl !== undefined
      ? norm(body.googleMapUrl) || null
      : undefined;

  // ✅ 受け取りは googleMapEmbedUrl / mapEmbedUrl どっちでもOK → DBは mapEmbedUrl
  const mapEmbedUrl =
    body.googleMapEmbedUrl !== undefined
      ? norm(body.googleMapEmbedUrl) || null
      : body.mapEmbedUrl !== undefined
      ? norm(body.mapEmbedUrl) || null
      : undefined;

  const mapLinkUrl =
    body.googleMapLinkUrl !== undefined
      ? norm(body.googleMapLinkUrl) || null
      : body.mapLinkUrl !== undefined
      ? norm(body.mapLinkUrl) || null
      : undefined;

  // slug 変更時の重複チェック
  if (slug && slug !== existing.slug) {
    const dup = await prisma.diagnosisCampus.findFirst({
      where: { schoolId, slug },
      select: { id: true },
    });
    if (dup) {
      return NextResponse.json(
        { message: "この slug は既に使用されています" },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.diagnosisCampus.update({
    where: { id },
    data: {
      ...(label !== undefined ? { label } : {}),
      ...(slug !== undefined ? { slug } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(address !== undefined ? { address } : {}),
      ...(access !== undefined ? { access } : {}),
      ...(googleMapUrl !== undefined ? { googleMapUrl } : {}),

      // ✅ DB実カラムに保存（ここが重要）
      ...(mapEmbedUrl !== undefined ? { mapEmbedUrl } : {}),
      ...(mapLinkUrl !== undefined ? { mapLinkUrl } : {}),
    },
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
      mapEmbedUrl: true,
      mapLinkUrl: true,
    },
  });

  return NextResponse.json(addAliases(updated as any));
}

// DELETE /api/diagnosis/campuses/:id?schoolId=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await ensureLoggedIn();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const id = norm(params.id);
  if (!id) {
    return NextResponse.json({ message: "id が必要です" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const schoolId = norm(
    searchParams.get("schoolId") ?? searchParams.get("school")
  );
  if (!schoolId) {
    return NextResponse.json(
      { message: "schoolId が必要です" },
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
