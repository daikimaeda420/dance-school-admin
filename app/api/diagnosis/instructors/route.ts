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

// =========================
// ✅ 追加：connect対象IDを解決（id/slug混在OK & 存在検証）
// =========================
function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

/**
 * ざっくり判定
 * - cuid: "c" で始まり長い
 * - uuid: 36文字で "-" を含む
 */
function looksLikeCuidOrUuid(v: string) {
  if (!v) return false;
  if (v.length >= 20 && v.startsWith("c")) return true;
  if (v.length === 36 && v.includes("-")) return true;
  return false;
}

type ResolveKind = "campus" | "course" | "genre";

async function resolveConnectIds(params: {
  schoolId: string;
  kind: ResolveKind;
  values: string[]; // id or slug
}): Promise<{ ids: string[]; missing: string[] }> {
  const { schoolId, kind } = params;

  const values = uniq(
    params.values.map((s) => String(s ?? "").trim()).filter(Boolean)
  );
  if (values.length === 0) return { ids: [], missing: [] };

  const byId = values.filter(looksLikeCuidOrUuid);
  const bySlug = values.filter((v) => !looksLikeCuidOrUuid(v));

  // ★ ここを switch で分岐して型を確定させる（union解消）
  if (kind === "campus") {
    const foundById =
      byId.length > 0
        ? await prisma.diagnosisCampus.findMany({
            where: { schoolId, id: { in: byId }, isActive: true },
            select: { id: true },
          })
        : [];

    const foundBySlug =
      bySlug.length > 0
        ? await prisma.diagnosisCampus.findMany({
            where: { schoolId, slug: { in: bySlug }, isActive: true },
            select: { id: true, slug: true },
          })
        : [];

    const ids = uniq([
      ...foundById.map((r) => r.id),
      ...foundBySlug.map((r) => r.id),
    ]);

    const foundSlugs = new Set(foundBySlug.map((r) => r.slug));
    const missing = bySlug.filter((s) => !foundSlugs.has(s));

    return { ids, missing };
  }

  if (kind === "course") {
    const foundById =
      byId.length > 0
        ? await prisma.diagnosisCourse.findMany({
            where: { schoolId, id: { in: byId }, isActive: true },
            select: { id: true },
          })
        : [];

    const foundBySlug =
      bySlug.length > 0
        ? await prisma.diagnosisCourse.findMany({
            where: { schoolId, slug: { in: bySlug }, isActive: true },
            select: { id: true, slug: true },
          })
        : [];

    const ids = uniq([
      ...foundById.map((r) => r.id),
      ...foundBySlug.map((r) => r.id),
    ]);

    const foundSlugs = new Set(foundBySlug.map((r) => r.slug));
    const missing = bySlug.filter((s) => !foundSlugs.has(s));

    return { ids, missing };
  }

  // kind === "genre"
  const foundById =
    byId.length > 0
      ? await prisma.diagnosisGenre.findMany({
          where: { schoolId, id: { in: byId }, isActive: true },
          select: { id: true },
        })
      : [];

  const foundBySlug =
    bySlug.length > 0
      ? await prisma.diagnosisGenre.findMany({
          where: { schoolId, slug: { in: bySlug }, isActive: true },
          select: { id: true, slug: true },
        })
      : [];

  const ids = uniq([
    ...foundById.map((r) => r.id),
    ...foundBySlug.map((r) => r.id),
  ]);

  const foundSlugs = new Set(foundBySlug.map((r) => r.slug));
  const missing = bySlug.filter((s) => !foundSlugs.has(s));

  return { ids, missing };
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

    const [campusR, courseR, genreR] = await Promise.all([
      resolveConnectIds({ schoolId, kind: "campus", values: campusIds }),
      resolveConnectIds({ schoolId, kind: "course", values: courseIds }),
      resolveConnectIds({ schoolId, kind: "genre", values: genreIds }),
    ]);

    // 任意：指定があるのに全部無い場合は400で返す（デバッグしやすい）
    if (campusIds.length > 0 && campusR.ids.length === 0) {
      return NextResponse.json(
        {
          message:
            "紐づけようとした校舎が見つかりません（id/slug・schoolId・isActive を確認）",
          debug: { campusIds, missing: campusR.missing },
        },
        { status: 400 }
      );
    }
    if (courseIds.length > 0 && courseR.ids.length === 0) {
      return NextResponse.json(
        {
          message:
            "紐づけようとしたコースが見つかりません（id/slug・schoolId・isActive を確認）",
          debug: { courseIds, missing: courseR.missing },
        },
        { status: 400 }
      );
    }
    if (genreIds.length > 0 && genreR.ids.length === 0) {
      return NextResponse.json(
        {
          message:
            "紐づけようとしたジャンルが見つかりません（id/slug・schoolId・isActive を確認）",
          debug: { genreIds, missing: genreR.missing },
        },
        { status: 400 }
      );
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
        photoData: photoData as any,

        courses: courseR.ids.length
          ? { connect: courseR.ids.map((cid) => ({ id: cid })) }
          : undefined,
        genres: genreR.ids.length
          ? { connect: genreR.ids.map((gid) => ({ id: gid })) }
          : undefined,
        campuses: campusR.ids.length
          ? { connect: campusR.ids.map((pid) => ({ id: pid })) }
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

    const [campusR, courseR, genreR] = await Promise.all([
      resolveConnectIds({ schoolId, kind: "campus", values: campusIds }),
      resolveConnectIds({ schoolId, kind: "course", values: courseIds }),
      resolveConnectIds({ schoolId, kind: "genre", values: genreIds }),
    ]);

    const data: any = {
      label,
      slug,
      sortOrder,
      isActive,

      courses: { set: courseR.ids.map((cid) => ({ id: cid })) },
      genres: { set: genreR.ids.map((gid) => ({ id: gid })) },
      campuses: { set: campusR.ids.map((pid) => ({ id: pid })) },
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
