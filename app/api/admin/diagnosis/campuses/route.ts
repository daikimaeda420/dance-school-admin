// app/api/admin/diagnosis/campuses/route.ts
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

// GET /api/admin/diagnosis/campuses?schoolId=xxx&full=1
export async function GET(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);

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

    return NextResponse.json(campuses);
  } catch (e) {
    console.error("Campus GET failed:", e);
    return NextResponse.json(
      { message: "校舎一覧の取得に失敗しました。" },
      { status: 500 }
    );
  }
}

// POST /api/admin/diagnosis/campuses
export async function POST(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);

    const schoolId = norm(body?.schoolId ?? body?.school);
    const label = norm(body?.label);
    const slug = norm(body?.slug);

    if (!schoolId || !label || !slug) {
      return NextResponse.json(
        { message: "schoolId / label / slug は必須です" },
        { status: 400 }
      );
    }

    const sortOrder = toNum(body?.sortOrder, 0);
    const isActive =
      body?.isActive === undefined ? true : toBool(body?.isActive, true);

    const address =
      body?.address !== undefined ? norm(body.address) || null : null;
    const access =
      body?.access !== undefined ? norm(body.access) || null : null;
    const googleMapUrl =
      body?.googleMapUrl !== undefined ? norm(body.googleMapUrl) || null : null;

    // ✅ 追加：iframe（互換で mapEmbedUrl も受ける）
    const googleMapEmbedUrl =
      body?.googleMapEmbedUrl !== undefined
        ? norm(body.googleMapEmbedUrl) || null
        : body?.mapEmbedUrl !== undefined
        ? norm(body.mapEmbedUrl) || null
        : null;

    const dup = await prisma.diagnosisCampus.findFirst({
      where: { schoolId, slug },
      select: { id: true },
    });
    if (dup) {
      return NextResponse.json(
        { message: "このslugは既に使われています（重複）。" },
        { status: 409 }
      );
    }

    const campus = await prisma.diagnosisCampus.create({
      data: {
        schoolId,
        label,
        slug,
        sortOrder,
        isActive,
        address,
        access,
        googleMapUrl,
        // ✅ 追加：iframe 用
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
        // ✅ 追加：iframe 用
        googleMapEmbedUrl: true,
      },
    });

    return NextResponse.json(campus, { status: 201 });
  } catch (e: any) {
    console.error("Campus POST failed:", e);

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
      { message: e?.message || "校舎の作成に失敗しました。" },
      { status: 500 }
    );
  }
}
