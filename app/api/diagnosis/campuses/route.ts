// app/api/diagnosis/campuses/route.ts
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

// GET /api/admin/diagnosis/campuses?schoolId=xxx&full=1
export async function GET(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId") ?? "";
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
          googleMapUrl: true,
          googleMapEmbedUrl: true, // ✅ 追加：返す
        }
      : {
          label: true,
          slug: true,
        },
  });

  return NextResponse.json(campuses);
}

// POST /api/admin/diagnosis/campuses
export async function POST(req: NextRequest) {
  const session = await ensureLoggedIn();
  if (!session)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));

  const schoolId = norm(body.schoolId);
  const label = norm(body.label);
  const slug = norm(body.slug);

  const sortOrder = toNum(body.sortOrder, 0);
  const isActive = toBool(body.isActive, true);

  const address =
    body.address !== undefined ? norm(body.address) || null : null;
  const access = body.access !== undefined ? norm(body.access) || null : null;

  const googleMapUrl =
    body.googleMapUrl !== undefined ? norm(body.googleMapUrl) || null : null;

  const googleMapEmbedUrl =
    body.googleMapEmbedUrl !== undefined
      ? norm(body.googleMapEmbedUrl) || null
      : null; // ✅ 追加

  if (!schoolId)
    return NextResponse.json(
      { message: "schoolId が必要です" },
      { status: 400 }
    );
  if (!label)
    return NextResponse.json({ message: "label が必要です" }, { status: 400 });
  if (!slug)
    return NextResponse.json({ message: "slug が必要です" }, { status: 400 });

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
      googleMapEmbedUrl, // ✅ 保存
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
      googleMapEmbedUrl: true, // ✅ 返す
    },
  });

  return NextResponse.json(created, { status: 201 });
}
