// app/api/diagnosis/instructors/route.ts
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

/**
 * courseIds / genreIds / campusIds を柔軟に受け取る
 * - fd.getAll("courseIds") のように同名キー複数
 * - fd.get("courseIds") が '["id1","id2"]' のJSON配列
 * - fd.get("courseIds") が "id1,id2" のCSV
 */
function readIdList(fd: FormData, key: string): string[] {
  const all = fd
    .getAll(key)
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);

  if (all.length >= 2) return Array.from(new Set(all));

  const raw = String(fd.get(key) ?? "").trim();
  if (!raw) return Array.from(new Set(all));

  if (raw.startsWith("[")) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return Array.from(
          new Set(arr.map((x) => String(x ?? "").trim()).filter(Boolean))
        );
      }
    } catch {
      // noop
    }
  }

  if (raw.includes(",")) {
    return Array.from(
      new Set(
        raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );
  }

  return Array.from(new Set([...all, raw])).filter(Boolean);
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

        // ✅ 追加：紐づけ情報
        courses: { select: { id: true, label: true, slug: true } },
        genres: {
          select: { id: true, label: true, slug: true, answerTag: true },
        },
        campuses: {
          select: {
            id: true,
            label: true,
            slug: true,
            isOnline: true,
            isActive: true,
          },
        },
      },
    });

    return NextResponse.json(
      rows.map((r) => ({
        ...r,
        photoMime: r.photoMime ?? null,
        courseIds: r.courses.map((c) => c.id),
        genreIds: r.genres.map((g) => g.id),
        campusIds: r.campuses.map((c) => c.id),
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

    // ✅ 追加：紐づけIDs
    const courseIds = readIdList(fd, "courseIds");
    const genreIds = readIdList(fd, "genreIds");
    const campusIds = readIdList(fd, "campusIds");

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
        photoData: photoData as any, // Prisma Bytes

        // ✅ 追加：紐づけ（任意）
        courses: courseIds.length
          ? { connect: courseIds.map((cid) => ({ id: cid })) }
          : undefined,
        genres: genreIds.length
          ? { connect: genreIds.map((gid) => ({ id: gid })) }
          : undefined,
        campuses: campusIds.length
          ? { connect: campusIds.map((pid) => ({ id: pid })) }
          : undefined,
      },
      select: {
        id: true,
        schoolId: true,
        label: true,
        slug: true,
        sortOrder: true,
        isActive: true,
        photoMime: true,

        courses: { select: { id: true, label: true, slug: true } },
        genres: {
          select: { id: true, label: true, slug: true, answerTag: true },
        },
        campuses: {
          select: {
            id: true,
            label: true,
            slug: true,
            isOnline: true,
            isActive: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        ...created,
        photoMime: created.photoMime ?? null,
        courseIds: created.courses.map((c) => c.id),
        genreIds: created.genres.map((g) => g.id),
        campusIds: created.campuses.map((c) => c.id),
      },
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

    // ✅ 追加：紐づけIDs（更新は set で置き換え）
    const courseIds = readIdList(fd, "courseIds");
    const genreIds = readIdList(fd, "genreIds");
    const campusIds = readIdList(fd, "campusIds");

    if (!id || !schoolId || !label || !slug) {
      return json("id / schoolId / label / slug は必須です", 400);
    }

    const existing = await prisma.diagnosisInstructor.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!existing) return json("対象が見つかりません", 404);

    const data: any = {
      label,
      slug,
      sortOrder,
      isActive,

      // ✅ 追加：紐づけを置き換え
      // 管理画面は毎回 courseIds/genreIds/campusIds を送る実装にするのが安全
      courses: { set: courseIds.map((cid) => ({ id: cid })) },
      genres: { set: genreIds.map((gid) => ({ id: gid })) },
      campuses: { set: campusIds.map((pid) => ({ id: pid })) },
    };

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
        data.photoData = new Uint8Array(ab) as any;
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

        courses: { select: { id: true, label: true, slug: true } },
        genres: {
          select: { id: true, label: true, slug: true, answerTag: true },
        },
        campuses: {
          select: {
            id: true,
            label: true,
            slug: true,
            isOnline: true,
            isActive: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...updated,
      photoMime: updated.photoMime ?? null,
      courseIds: updated.courses.map((c) => c.id),
      genreIds: updated.genres.map((g) => g.id),
      campusIds: updated.campuses.map((c) => c.id),
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

        courses: { select: { id: true, label: true, slug: true } },
        genres: {
          select: { id: true, label: true, slug: true, answerTag: true },
        },
        campuses: {
          select: {
            id: true,
            label: true,
            slug: true,
            isOnline: true,
            isActive: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...updated,
      photoMime: updated.photoMime ?? null,
      courseIds: updated.courses.map((c) => c.id),
      genreIds: updated.genres.map((g) => g.id),
      campusIds: updated.campuses.map((c) => c.id),
    });
  } catch (e: any) {
    console.error(e);
    return json(e?.message ?? "無効化に失敗しました", 500);
  }
}
