// app/api/diagnosis/campuses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

/**
 * PATCH /api/diagnosis/campuses/:id
 * - 編集保存（label/slug/sortOrder/isOnline/address/access/googleMapUrl）
 * - 有効/無効切替（isActive）
 *
 * body:
 * {
 *   schoolId: string,
 *   label?: string,
 *   slug?: string,
 *   sortOrder?: number,
 *   isOnline?: boolean,
 *   isActive?: boolean,
 *   address?: string | null,
 *   access?: string | null,
 *   googleMapUrl?: string | null
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = norm(params.id);
  if (!id) {
    return NextResponse.json({ message: "id が必要です" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as any));

  // ✅ 後方互換：school / schoolId
  const schoolId = norm(body.schoolId ?? body.school);
  if (!schoolId) {
    return NextResponse.json(
      { message: "schoolId（または school）が必要です" },
      { status: 400 }
    );
  }

  // ✅ 対象が schoolId に属するか確認（誤更新防止）
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

  // 入力の取り出し（渡されたものだけ更新）
  const label = body.label !== undefined ? norm(body.label) : undefined;
  const slug = body.slug !== undefined ? norm(body.slug) : undefined;

  const sortOrder =
    body.sortOrder !== undefined ? toNum(body.sortOrder, 0) : undefined;

  const isOnline =
    body.isOnline !== undefined ? toBool(body.isOnline, false) : undefined;

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

  // slug 変更時の重複チェック（schoolId内でユニーク運用）
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
      ...(isOnline !== undefined ? { isOnline } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(address !== undefined ? { address } : {}),
      ...(access !== undefined ? { access } : {}),
      ...(googleMapUrl !== undefined ? { googleMapUrl } : {}),
    },
    select: {
      id: true,
      schoolId: true,
      label: true,
      slug: true,
      sortOrder: true,
      isOnline: true,
      isActive: true,
      address: true,
      access: true,
      googleMapUrl: true,
    },
  });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/diagnosis/campuses/:id?schoolId=xxx（または &school=xxx）
 * - 削除（物理削除）
 *
 * ※ 関連レコードがあると外部キー制約で失敗する可能性があります。
 *    その場合は「削除＝isActive=false（論理削除）」運用に変更してください。
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
      { message: "schoolId（または school）が必要です" },
      { status: 400 }
    );
  }

  // ✅ 対象が schoolId に属するか確認（誤削除防止）
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
    // 外部キー制約などで消せないケース
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
