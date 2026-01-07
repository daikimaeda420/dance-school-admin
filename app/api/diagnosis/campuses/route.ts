// app/api/diagnosis/campuses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DiagnosisQuestionOption } from "@/lib/diagnosis/config";

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // ✅ 後方互換：school / schoolId どちらでもOK
  const schoolId =
    searchParams.get("schoolId") ?? searchParams.get("school") ?? "";

  // ✅ 追加：詳細返却フラグ
  const full = searchParams.get("full") === "1";

  if (!schoolId) {
    return NextResponse.json(
      { message: "schoolId（または school）パラメータが必要です" },
      { status: 400 }
    );
  }

  /**
   * full=1: 管理画面用（有効/無効含む全件）
   * full!=1: 診断フロント用（有効のみ・必要最低限）
   */
  const campuses = await prisma.diagnosisCampus.findMany({
    where: full ? { schoolId } : { schoolId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    select: full
      ? {
          id: true,
          schoolId: true,
          label: true,
          slug: true,
          sortOrder: true,
          isActive: true,
          address: true,
          access: true,
          googleMapUrl: true,
        }
      : {
          label: true,
          slug: true,
        },
  });

  if (!full) {
    const options: DiagnosisQuestionOption[] = campuses.map((c) => ({
      id: c.slug,
      label: c.label,
    }));
    return NextResponse.json(options);
  }

  // full=1 のときは詳細を返す（管理画面や詳細表示用）
  return NextResponse.json(campuses);
}

/**
 * ✅ 追加：POSTで校舎を新規作成できるようにする
 * POST /api/diagnosis/campuses
 * body: { schoolId, label, slug, sortOrder?, isActive?, address?, access?, googleMapUrl? }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));

  const schoolId = norm(body.schoolId ?? body.school);
  const label = norm(body.label);
  const slug = norm(body.slug);

  const sortOrder = toNum(body.sortOrder, 0);
  const isActive = toBool(body.isActive, true);

  const address =
    body.address !== undefined ? norm(body.address) || null : null;
  const access = body.access !== undefined ? norm(body.access) || null : null;
  const googleMapUrl =
    body.googleMapUrl !== undefined ? norm(body.googleMapUrl) || null : null;

  if (!schoolId) {
    return NextResponse.json(
      { message: "schoolId（または school）が必要です" },
      { status: 400 }
    );
  }
  if (!label) {
    return NextResponse.json({ message: "label が必要です" }, { status: 400 });
  }
  if (!slug) {
    return NextResponse.json({ message: "slug が必要です" }, { status: 400 });
  }

  // slug重複チェック（schoolId内でユニーク運用）
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

  const created = await prisma.diagnosisCampus.create({
    data: {
      schoolId,
      label,
      slug,
      sortOrder,
      isActive,
      address,
      access,
      googleMapUrl,
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
    },
  });

  return NextResponse.json(created, { status: 201 });
}
