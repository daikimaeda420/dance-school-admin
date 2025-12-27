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
// ✅ connect対象IDを解決（id/slug/answerTag/label混在OK）
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
  values: string[];
}): Promise<{ ids: string[]; missing: string[] }> {
  const { schoolId, kind } = params;

  const values = uniq(
    params.values.map((s) => String(s ?? "").trim()).filter(Boolean)
  );
  if (values.length === 0) return { ids: [], missing: [] };

  const byId = values.filter(looksLikeCuidOrUuid);
  const byKey = values.filter((v) => !looksLikeCuidOrUuid(v)); // slug / answerTag / label 等

  if (kind === "campus") {
    const foundById =
      byId.length > 0
        ? await prisma.diagnosisCampus.findMany({
            where: { schoolId, id: { in: byId }, isActive: true },
            select: { id: true },
          })
        : [];

    const foundBySlug =
      byKey.length > 0
        ? await prisma.diagnosisCampus.findMany({
            where: { schoolId, slug: { in: byKey }, isActive: true },
            select: { id: true, slug: true },
          })
        : [];

    const ids = uniq([
      ...foundById.map((r) => r.id),
      ...foundBySlug.map((r) => r.id),
    ]);

    const foundSlugs = new Set(foundBySlug.map((r) => r.slug));
    const missing = byKey.filter((s) => !foundSlugs.has(s));
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
      byKey.length > 0
        ? await prisma.diagnosisCourse.findMany({
            where: { schoolId, slug: { in: byKey }, isActive: true },
            select: { id: true, slug: true },
          })
        : [];

    const ids = uniq([
      ...foundById.map((r) => r.id),
      ...foundBySlug.map((r) => r.id),
    ]);

    const foundSlugs = new Set(foundBySlug.map((r) => r.slug));
    const missing = byKey.filter((s) => !foundSlugs.has(s));
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

  const foundByKey =
    byKey.length > 0
      ? await prisma.diagnosisGenre.findMany({
          where: {
            schoolId,
            isActive: true,
            OR: [
              { slug: { in: byKey } },
              { answerTag: { in: byKey } },
              { label: { in: byKey } },
            ],
          },
          select: { id: true, slug: true, answerTag: true, label: true },
        })
      : [];

  const ids = uniq([
    ...foundById.map((r) => r.id),
    ...foundByKey.map((r) => r.id),
  ]);

  const foundKeys = new Set(
    foundByKey.flatMap(
      (r) => [r.slug, r.answerTag, r.label].filter(Boolean) as string[]
    )
  );
  const missing = byKey.filter((s) => !foundKeys.has(s));

  return { ids, missing };
}

// =========================
// GET /api/diagnosis/instructors?schoolId=xxx
// =========================
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

        // ✅ 明示中間から拾う
        courseLinks: {
          select: {
            course: { select: { id: true, label: true, slug: true } },
          },
        },
        genreLinks: {
          select: {
            genre: {
              select: { id: true, label: true, slug: true, answerTag: true },
            },
          },
        },
        campusLinks: {
          select: {
            campus: {
              select: {
                id: true,
                label: true,
                slug: true,
                isOnline: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      rows.map((r) => {
        const courses = r.courseLinks.map((x) => x.course);
        const genres = r.genreLinks.map((x) => x.genre);
        const campuses = r.campusLinks.map((x) => x.campus);

        return {
          id: r.id,
          schoolId: r.schoolId,
          label: r.label,
          slug: r.slug,
          sortOrder: r.sortOrder,
          isActive: r.isActive,
          photoMime: r.photoMime ?? null,

          courses,
          genres,
          campuses,

          courseIds: courses.map((c) => c.id),
          genreIds: genres.map((g) => g.id),
          campusIds: campuses.map((c) => c.id),
        };
      })
    );
  } catch (e: any) {
    console.error(e);
    return json(e?.message ?? "DiagnosisInstructor の取得に失敗しました", 500);
  }
}

// =========================
// POST /api/diagnosis/instructors
// =========================
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

    const courseVals = readIdList(fd, "courseIds");
    const genreVals = readIdList(fd, "genreIds");
    const campusVals = readIdList(fd, "campusIds");

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
      resolveConnectIds({ schoolId, kind: "campus", values: campusVals }),
      resolveConnectIds({ schoolId, kind: "course", values: courseVals }),
      resolveConnectIds({ schoolId, kind: "genre", values: genreVals }),
    ]);

    // 校舎/コースは指定があるのに0件なら止める（運用的に必須になりがち）
    if (campusVals.length > 0 && campusR.ids.length === 0) {
      return NextResponse.json(
        {
          message:
            "紐づけようとした校舎が見つかりません（id/slug・schoolId・isActive を確認）",
          debug: { campusVals, missing: campusR.missing },
        },
        { status: 400 }
      );
    }
    if (courseVals.length > 0 && courseR.ids.length === 0) {
      return NextResponse.json(
        {
          message:
            "紐づけようとしたコースが見つかりません（id/slug・schoolId・isActive を確認）",
          debug: { courseVals, missing: courseR.missing },
        },
        { status: 400 }
      );
    }

    // genre は運用上「後で直す」こともあるので、指定があるのに0件でも止めない（必要ならここも400にしてOK）
    if (genreVals.length > 0 && genreR.ids.length === 0) {
      console.warn("[DiagnosisInstructor.create] genre not found", {
        schoolId,
        genreVals,
        missing: genreR.missing,
      });
    }

    const created = await prisma.$transaction(async (tx) => {
      const instructor = await tx.diagnosisInstructor.create({
        data: {
          id,
          schoolId,
          label,
          slug,
          sortOrder,
          isActive,
          photoMime,
          photoData: photoData as any,
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

      // ✅ 明示中間に createMany
      if (courseR.ids.length > 0) {
        await tx.diagnosisInstructorCourse.createMany({
          data: courseR.ids.map((courseId) => ({
            instructorId: instructor.id,
            courseId,
            schoolId,
          })),
          skipDuplicates: true,
        });
      }

      if (genreR.ids.length > 0) {
        await tx.diagnosisInstructorGenre.createMany({
          data: genreR.ids.map((genreId) => ({
            instructorId: instructor.id,
            genreId,
            schoolId,
          })),
          skipDuplicates: true,
        });
      }

      if (campusR.ids.length > 0) {
        await tx.diagnosisInstructorCampus.createMany({
          data: campusR.ids.map((campusId) => ({
            instructorId: instructor.id,
            campusId,
            schoolId,
          })),
          skipDuplicates: true,
        });
      }

      // 返却用に再取得（リンク込み）
      const full = await tx.diagnosisInstructor.findUnique({
        where: { id: instructor.id },
        select: {
          id: true,
          schoolId: true,
          label: true,
          slug: true,
          sortOrder: true,
          isActive: true,
          photoMime: true,
          courseLinks: {
            select: {
              course: { select: { id: true, label: true, slug: true } },
            },
          },
          genreLinks: {
            select: {
              genre: {
                select: { id: true, label: true, slug: true, answerTag: true },
              },
            },
          },
          campusLinks: {
            select: {
              campus: {
                select: {
                  id: true,
                  label: true,
                  slug: true,
                  isOnline: true,
                  isActive: true,
                },
              },
            },
          },
        },
      });

      return full!;
    });

    const courses = created.courseLinks.map((x) => x.course);
    const genres = created.genreLinks.map((x) => x.genre);
    const campuses = created.campusLinks.map((x) => x.campus);

    return NextResponse.json(
      {
        id: created.id,
        schoolId: created.schoolId,
        label: created.label,
        slug: created.slug,
        sortOrder: created.sortOrder,
        isActive: created.isActive,
        photoMime: created.photoMime ?? null,
        courses,
        genres,
        campuses,
        courseIds: courses.map((c) => c.id),
        genreIds: genres.map((g) => g.id),
        campusIds: campuses.map((c) => c.id),
      },
      { status: 201 }
    );
  } catch (e: any) {
    console.error(e);
    return json(e?.message ?? "作成に失敗しました", 500);
  }
}

// =========================
// PUT /api/diagnosis/instructors
// =========================
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

    const courseVals = readIdList(fd, "courseIds");
    const genreVals = readIdList(fd, "genreIds");
    const campusVals = readIdList(fd, "campusIds");

    if (!id || !schoolId || !label || !slug) {
      return json("id / schoolId / label / slug は必須です", 400);
    }

    const existing = await prisma.diagnosisInstructor.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!existing) return json("対象が見つかりません", 404);

    const [campusR, courseR, genreR] = await Promise.all([
      resolveConnectIds({ schoolId, kind: "campus", values: campusVals }),
      resolveConnectIds({ schoolId, kind: "course", values: courseVals }),
      resolveConnectIds({ schoolId, kind: "genre", values: genreVals }),
    ]);

    const updated = await prisma.$transaction(async (tx) => {
      const data: any = { label, slug, sortOrder, isActive };

      if (clearPhoto) {
        data.photoMime = null;
        data.photoData = null;
      } else {
        const file = fd.get("file");
        if (file && file instanceof File && file.size > 0) {
          if (file.size > MAX_IMAGE_BYTES) {
            throw new Error(
              `画像サイズが大きすぎます（上限 ${MAX_IMAGE_BYTES} bytes）`
            );
          }
          data.photoMime = file.type || "application/octet-stream";
          const ab = await file.arrayBuffer();
          data.photoData = new Uint8Array(ab) as any;
        }
      }

      await tx.diagnosisInstructor.update({
        where: { id: existing.id },
        data,
      });

      // ✅ 既存リンクを一旦全削除 → createMany で置き換え
      await tx.diagnosisInstructorCourse.deleteMany({
        where: { instructorId: existing.id },
      });
      await tx.diagnosisInstructorGenre.deleteMany({
        where: { instructorId: existing.id },
      });
      await tx.diagnosisInstructorCampus.deleteMany({
        where: { instructorId: existing.id },
      });

      if (courseR.ids.length > 0) {
        await tx.diagnosisInstructorCourse.createMany({
          data: courseR.ids.map((courseId) => ({
            instructorId: existing.id,
            courseId,
            schoolId,
          })),
          skipDuplicates: true,
        });
      }
      if (genreR.ids.length > 0) {
        await tx.diagnosisInstructorGenre.createMany({
          data: genreR.ids.map((genreId) => ({
            instructorId: existing.id,
            genreId,
            schoolId,
          })),
          skipDuplicates: true,
        });
      }
      if (campusR.ids.length > 0) {
        await tx.diagnosisInstructorCampus.createMany({
          data: campusR.ids.map((campusId) => ({
            instructorId: existing.id,
            campusId,
            schoolId,
          })),
          skipDuplicates: true,
        });
      }

      const full = await tx.diagnosisInstructor.findUnique({
        where: { id: existing.id },
        select: {
          id: true,
          schoolId: true,
          label: true,
          slug: true,
          sortOrder: true,
          isActive: true,
          photoMime: true,
          courseLinks: {
            select: {
              course: { select: { id: true, label: true, slug: true } },
            },
          },
          genreLinks: {
            select: {
              genre: {
                select: { id: true, label: true, slug: true, answerTag: true },
              },
            },
          },
          campusLinks: {
            select: {
              campus: {
                select: {
                  id: true,
                  label: true,
                  slug: true,
                  isOnline: true,
                  isActive: true,
                },
              },
            },
          },
        },
      });

      return full!;
    });

    const courses = updated.courseLinks.map((x) => x.course);
    const genres = updated.genreLinks.map((x) => x.genre);
    const campuses = updated.campusLinks.map((x) => x.campus);

    return NextResponse.json({
      id: updated.id,
      schoolId: updated.schoolId,
      label: updated.label,
      slug: updated.slug,
      sortOrder: updated.sortOrder,
      isActive: updated.isActive,
      photoMime: updated.photoMime ?? null,
      courses,
      genres,
      campuses,
      courseIds: courses.map((c) => c.id),
      genreIds: genres.map((g) => g.id),
      campusIds: campuses.map((c) => c.id),
    });
  } catch (e: any) {
    console.error(e);
    return json(e?.message ?? "更新に失敗しました", 500);
  }
}

// =========================
// DELETE /api/diagnosis/instructors?id=xxx&schoolId=yyy（無効化）
// =========================
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
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: updated.id });
  } catch (e: any) {
    console.error(e);
    return json(e?.message ?? "無効化に失敗しました", 500);
  }
}
