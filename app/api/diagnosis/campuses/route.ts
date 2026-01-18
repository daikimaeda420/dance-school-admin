// app/api/diagnosis/campuses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
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

async function ensureLoggedIn() {
  const session = await getServerSession(authOptions);
  return session?.user?.email ? session : null;
}

/**
 * 返却互換:
 * - DB実体: googleMapUrl / googleMapEmbedUrl（schema.prisma準拠）
 * - 旧キー: mapEmbedUrl / mapLinkUrl が欲しい場合も返す（保存はしない）
 */
function addAliases<
  T extends { googleMapEmbedUrl?: string | null; googleMapUrl?: string | null }
>(row: T) {
  return {
    ...row,
    mapEmbedUrl: row.googleMapEmbedUrl ?? null,
    mapLinkUrl: row.googleMapUrl ?? null,
  };
}

// GET /api/diagnosis/campuses?schoolId=xxx&full=1
export async function GET(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  // 後方互換：schoolId / school
  const schoolId = norm(
    searchParams.get("schoolId") ?? searchParams.get("school")
  );
  const full = searchParams.get("full") === "1";

  if (!schoolId) {
    return NextResponse.json(
      { message: "schoolId が必要です" },
      { status: 400 }
    );
  }

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

          // ✅ schema.prisma に存在するフィールドのみ
          googleMapUrl: true,
          googleMapEmbedUrl: true,
        }
      : {
          label: true,
          slug: true,
        },
  });

  // フロント診断用（fullじゃない）は options 形式で返す運用
  if (!full) {
    const options: DiagnosisQuestionOption[] = (campuses as any[]).map((c) => ({
      id: c.slug,
      label: c.label,
    }));
    return NextResponse.json(options);
  }

  // 管理画面用：互換フィールド付きで返す
  return NextResponse.json((campuses as any[]).map(addAliases));
}

// POST /api/diagnosis/campuses
export async function POST(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as any));

  // 後方互換：schoolId / school
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

  // ✅ 受け取りはどっちでもOK、DBは googleMapEmbedUrl へ保存（schema準拠）
  const googleMapEmbedUrl =
    body.googleMapEmbedUrl !== undefined
      ? norm(body.googleMapEmbedUrl) || null
      : body.mapEmbedUrl !== undefined
      ? norm(body.mapEmbedUrl) || null
      : null;

  if (!schoolId) {
    return NextResponse.json(
      { message: "schoolId が必要です" },
      { status: 400 }
    );
  }
  if (!label) {
    return NextResponse.json({ message: "label が必要です" }, { status: 400 });
  }
  if (!slug) {
    return NextResponse.json({ message: "slug が必要です" }, { status: 400 });
  }

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

      // ✅ schema.prismaのフィールドへ保存
      googleMapEmbedUrl,
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
      googleMapEmbedUrl: true,
    },
  });

  return NextResponse.json(addAliases(created), { status: 201 });
}
