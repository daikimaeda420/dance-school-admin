import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const runtime = "nodejs";

async function ensureLoggedIn() {
  const session = await getServerSession(authOptions);
  return session?.user?.email ? session : null;
}

function toBool(v: any, fallback: boolean) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true";
  return fallback;
}

function toNum(v: any, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB
function json(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

// GET /api/diagnosis/instructors?schoolId=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId")?.trim();
    if (!schoolId) return json("schoolId が必要です", 400);

    const rows = await prisma.diagnosisInstructor.findMany({
      where: { schoolId },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        schoolId: true,
        label: true,
        slug: true,
        sortOrder: true,
        isActive: true,
        photoMime: true,
      },
    });

    return NextResponse.json(
      rows.map((r) => ({
        ...r,
        photoMime: r.photoMime ?? null,
      }))
    );
  } catch (e: any) {
    console.error(e);
    return json(e?.message ?? "DiagnosisInstructor の取得に失敗しました", 500);
  }
}

// POST /api/diagnosis/instructors
export async function POST(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return json("multipart/form-data が必要です", 400);
    }

    const fd = await req.formData();
    const id = String(fd.get("id") ?? "").trim();
    const schoolId = String(fd.get("schoolId") ?? "").trim();
    const label = String(fd.get("label") ?? "").trim();
    const slug = String(fd.get("slug") ?? "").trim();
    const sortOrder = toNum(fd.get("sortOrder"), 0);
    const isActive = toBool(fd.get("isActive"), true);

    if (!id || !schoolId || !label || !slug) {
      return json("id / schoolId / label / slug は必須です", 400);
    }

    const file = fd.get("file");
    let photoMime: string | null = null;
    let photoData: Uint8Array | null = null;

    if (file && file instanceof File && file.size > 0) {
      if (file.size > MAX_IMAGE_BYTES) {
        return json(
          `画像サイズが大きすぎます（上限 ${MAX_IMAGE_BYTES} bytes）`,
          400
        );
      }
      photoMime = file.type || "application/octet-stream";
      const ab = await file.arrayBuffer();
      photoData = new Uint8Array(ab);
    }

    const created = await prisma.diagnosisInstructor.create({
      data: {
        id,
        schoolId,
        label,
        slug,
        sortOrder,
        isActive,
        photoMime,
        photoData: photoData as any, // ✅ ここだけ型落とし（Prisma Bytes用）
      },
      select: {
        id: true,
        schoolId: true,
        label: true,
        slug: true,
        sortOrder: true,
        isActive: true,
        photoMime: true,
      },
    });

    return NextResponse.json(
      { ...created, photoMime: created.photoMime ?? null },
      { status: 201 }
    );
  } catch (e: any) {
    console.error(e);
    return json(e?.message ?? "作成に失敗しました", 500);
  }
}

// PUT /api/diagnosis/instructors
export async function PUT(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return json("multipart/form-data が必要です", 400);
    }

    const fd = await req.formData();
    const id = String(fd.get("id") ?? "").trim();
    const schoolId = String(fd.get("schoolId") ?? "").trim();
    const label = String(fd.get("label") ?? "").trim();
    const slug = String(fd.get("slug") ?? "").trim();
    const sortOrder = toNum(fd.get("sortOrder"), 0);
    const isActive = toBool(fd.get("isActive"), true);
    const clearPhoto = toBool(fd.get("clearPhoto"), false);

    if (!id || !schoolId || !label || !slug) {
      return json("id / schoolId / label / slug は必須です", 400);
    }

    const existing = await prisma.diagnosisInstructor.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!existing) return json("対象が見つかりません", 404);

    const data: any = { label, slug, sortOrder, isActive };

    if (clearPhoto) {
      data.photoMime = null;
      data.photoData = null;
    } else {
      const file = fd.get("file");
      if (file && file instanceof File && file.size > 0) {
        if (file.size > MAX_IMAGE_BYTES) {
          return json(
            `画像サイズが大きすぎます（上限 ${MAX_IMAGE_BYTES} bytes）`,
            400
          );
        }
        data.photoMime = file.type || "application/octet-stream";
        const ab = await file.arrayBuffer();
        data.photoData = new Uint8Array(ab) as any; // ✅ ここも型落とし
      }
    }

    const updated = await prisma.diagnosisInstructor.update({
      where: { id: existing.id },
      data,
      select: {
        id: true,
        schoolId: true,
        label: true,
        slug: true,
        sortOrder: true,
        isActive: true,
        photoMime: true,
      },
    });

    return NextResponse.json({
      ...updated,
      photoMime: updated.photoMime ?? null,
    });
  } catch (e: any) {
    console.error(e);
    return json(e?.message ?? "更新に失敗しました", 500);
  }
}

// DELETE /api/diagnosis/instructors?id=xxx&schoolId=yyy（無効化）
export async function DELETE(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id")?.trim();
    const schoolId = searchParams.get("schoolId")?.trim();
    if (!id || !schoolId) return json("id / schoolId が必要です", 400);

    const existing = await prisma.diagnosisInstructor.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!existing) return json("対象が見つかりません", 404);

    const updated = await prisma.diagnosisInstructor.update({
      where: { id: existing.id },
      data: { isActive: false },
      select: {
        id: true,
        schoolId: true,
        label: true,
        slug: true,
        sortOrder: true,
        isActive: true,
        photoMime: true,
      },
    });

    return NextResponse.json({
      ...updated,
      photoMime: updated.photoMime ?? null,
    });
  } catch (e: any) {
    console.error(e);
    return json(e?.message ?? "無効化に失敗しました", 500);
  }
}
