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
 * courseIds / campusIds / genreIds を柔軟に受け取る
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
          new Set(arr.map((x) => String(x ?? "").trim()).filter(Boolean)),
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
          .filter(Boolean),
      ),
    );
  }

  return Array.from(new Set([...all, raw])).filter(Boolean);
}

function uniq(arr: string[]) {
  return Array.from(
    new Set(arr.map((s) => String(s ?? "").trim()).filter(Boolean)),
  );
}

type ResolveKind = "campus" | "course" | "genre";

/**
 * ✅ id/slug/label が混在していても「存在する実ID」に解決する
 * ※ 管理画面の紐づけが勝手に消えないように isActive はここでは見ない（結果側で絞る）
 */
async function resolveConnectIds(params: {
  schoolId: string;
  kind: ResolveKind;
  values: string[];
}): Promise<{ ids: string[]; missing: string[] }> {
  const schoolId = params.schoolId;
  const values = uniq(params.values);
  if (values.length === 0) return { ids: [], missing: [] };

  if (params.kind === "campus") {
    const found = await prisma.diagnosisCampus.findMany({
      where: {
        schoolId,
        OR: [
          { id: { in: values } },
          { slug: { in: values } },
          { label: { in: values } },
        ],
      },
      select: { id: true, slug: true, label: true },
    });

    const ids = uniq(found.map((r) => r.id));
    const foundKeys = new Set(
      found.flatMap((r) => [r.id, r.slug, r.label].filter(Boolean) as string[]),
    );
    const missing = values.filter((v) => !foundKeys.has(v));
    return { ids, missing };
  }

  if (params.kind === "course") {
    const found = await prisma.diagnosisCourse.findMany({
      where: {
        schoolId,
        OR: [
          { id: { in: values } },
          { slug: { in: values } },
          { label: { in: values } },
        ],
      },
      select: { id: true, slug: true, label: true },
    });

    const ids = uniq(found.map((r) => r.id));
    const foundKeys = new Set(
      found.flatMap((r) => [r.id, r.slug, r.label].filter(Boolean) as string[]),
    );
    const missing = values.filter((v) => !foundKeys.has(v));
    return { ids, missing };
  }

  // genre
  const found = await prisma.diagnosisGenre.findMany({
    where: {
      schoolId,
      OR: [
        { id: { in: values } },
        { slug: { in: values } },
        { label: { in: values } },
        { answerTag: { in: values } },
      ],
    },
    select: { id: true, slug: true, label: true, answerTag: true },
  });

  const ids = uniq(found.map((r) => r.id));
  const foundKeys = new Set(
    found.flatMap((r) =>
      [r.id, r.slug, r.label, r.answerTag].filter(Boolean),
    ) as string[],
  );
  const missing = values.filter((v) => !foundKeys.has(v));
  return { ids, missing };
}

/**
 * ✅ 明示中間（Course/Campus/Genre）からまとめて返す
 */
async function fetchLinks(schoolId: string, instructorIds: string[]) {
  if (instructorIds.length === 0) {
    return {
      coursesByInstructor: new Map<string, any[]>(),
      campusesByInstructor: new Map<string, any[]>(),
      genresByInstructor: new Map<string, any[]>(),
    };
  }

  const [courseLinks, campusLinks, genreLinks] = await Promise.all([
    prisma.diagnosisInstructorCourse.findMany({
      where: { schoolId, instructorId: { in: instructorIds } },
      select: { instructorId: true, courseId: true },
    }),
    prisma.diagnosisInstructorCampus.findMany({
      where: { schoolId, instructorId: { in: instructorIds } },
      select: { instructorId: true, campusId: true },
    }),
    prisma.diagnosisInstructorGenre.findMany({
      where: { schoolId, instructorId: { in: instructorIds } },
      select: { instructorId: true, genreId: true },
    }),
  ]);

  const courseIds = Array.from(new Set(courseLinks.map((x) => x.courseId)));
  const campusIds = Array.from(new Set(campusLinks.map((x) => x.campusId)));
  const genreIds = Array.from(new Set(genreLinks.map((x) => x.genreId)));

  const [courses, campuses, genres] = await Promise.all([
    courseIds.length
      ? prisma.diagnosisCourse.findMany({
          where: { id: { in: courseIds } },
          select: { id: true, label: true, slug: true },
        })
      : Promise.resolve([]),
    campusIds.length
      ? prisma.diagnosisCampus.findMany({
          where: { id: { in: campusIds } },
          select: { id: true, label: true, slug: true, isActive: true },
        })
      : Promise.resolve([]),
    genreIds.length
      ? prisma.diagnosisGenre.findMany({
          where: { id: { in: genreIds } },
          select: { id: true, label: true, slug: true, answerTag: true },
        })
      : Promise.resolve([]),
  ]);

  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const campusMap = new Map(campuses.map((c) => [c.id, c]));
  const genreMap = new Map(genres.map((g) => [g.id, g]));

  const coursesByInstructor = new Map<string, any[]>();
  for (const row of courseLinks) {
    const c = courseMap.get(row.courseId);
    if (!c) continue;
    const cur = coursesByInstructor.get(row.instructorId) ?? [];
    cur.push(c);
    coursesByInstructor.set(row.instructorId, cur);
  }

  const campusesByInstructor = new Map<string, any[]>();
  for (const row of campusLinks) {
    const c = campusMap.get(row.campusId);
    if (!c) continue;
    const cur = campusesByInstructor.get(row.instructorId) ?? [];
    cur.push(c);
    campusesByInstructor.set(row.instructorId, cur);
  }

  const genresByInstructor = new Map<string, any[]>();
  for (const row of genreLinks) {
    const g = genreMap.get(row.genreId);
    if (!g) continue;
    const cur = genresByInstructor.get(row.instructorId) ?? [];
    cur.push(g);
    genresByInstructor.set(row.instructorId, cur);
  }

  return { coursesByInstructor, campusesByInstructor, genresByInstructor };
}

function readOptionalText(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? "").trim();
  return v ? v : null;
}

function hasField(fd: FormData, key: string): boolean {
  return fd.has(key);
}

// =========================
// GET /api/diagnosis/instructors?schoolId=xxx
// =========================
export async function GET(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const { searchParams } = new URL(req.url);

    const schoolId =
      searchParams.get("schoolId")?.trim() ||
      String((session.user as any)?.schoolId ?? "").trim();

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
        charmTags: true,
        introduction: true,
      },
    });

    const instructorIds = rows.map((r) => r.id);
    const { coursesByInstructor, campusesByInstructor, genresByInstructor } =
      await fetchLinks(schoolId, instructorIds);

    return NextResponse.json(
      rows.map((r) => {
        const courses = coursesByInstructor.get(r.id) ?? [];
        const campuses = campusesByInstructor.get(r.id) ?? [];
        const genres = genresByInstructor.get(r.id) ?? [];
        return {
          ...r,
          photoMime: r.photoMime ?? null,
          charmTags: r.charmTags ?? null,
          introduction: r.introduction ?? null,
          courses,
          campuses,
          genres,
          courseIds: courses.map((c: any) => c.id),
          campusIds: campuses.map((c: any) => c.id),
          genreIds: genres.map((g: any) => g.id),
        };
      }),
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

    const charmTags = readOptionalText(fd, "charmTags");
    const introduction = readOptionalText(fd, "introduction");

    const courseVals = readIdList(fd, "courseIds");
    const campusVals = readIdList(fd, "campusIds");
    const genreVals = readIdList(fd, "genreIds");

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
          400,
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

    const instructor = await prisma.$transaction(async (tx) => {
      const created = await tx.diagnosisInstructor.create({
        data: {
          id,
          schoolId,
          label,
          slug,
          sortOrder,
          isActive,
          photoMime,
          photoData: photoData as any,
          charmTags,
          introduction,
        },
        select: {
          id: true,
          schoolId: true,
          label: true,
          slug: true,
          sortOrder: true,
          isActive: true,
          photoMime: true,
          charmTags: true,
          introduction: true,
        },
      });

      if (courseR.ids.length > 0) {
        await tx.diagnosisInstructorCourse.createMany({
          data: courseR.ids.map((courseId) => ({
            instructorId: created.id,
            courseId,
            schoolId,
          })),
          skipDuplicates: true,
        });
      }

      if (campusR.ids.length > 0) {
        await tx.diagnosisInstructorCampus.createMany({
          data: campusR.ids.map((campusId) => ({
            instructorId: created.id,
            campusId,
            schoolId,
          })),
          skipDuplicates: true,
        });
      }

      if (genreR.ids.length > 0) {
        await tx.diagnosisInstructorGenre.createMany({
          data: genreR.ids.map((genreId) => ({
            instructorId: created.id,
            genreId,
            schoolId,
          })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    const { coursesByInstructor, campusesByInstructor, genresByInstructor } =
      await fetchLinks(schoolId, [instructor.id]);

    const courses = coursesByInstructor.get(instructor.id) ?? [];
    const campuses = campusesByInstructor.get(instructor.id) ?? [];
    const genres = genresByInstructor.get(instructor.id) ?? [];

    return NextResponse.json(
      {
        ...instructor,
        photoMime: instructor.photoMime ?? null,
        charmTags: instructor.charmTags ?? null,
        introduction: instructor.introduction ?? null,
        courses,
        campuses,
        genres,
        courseIds: courses.map((c: any) => c.id),
        campusIds: campuses.map((c: any) => c.id),
        genreIds: genres.map((g: any) => g.id),
      },
      { status: 201 },
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

    const charmTags = hasField(fd, "charmTags")
      ? readOptionalText(fd, "charmTags")
      : undefined;
    const introduction = hasField(fd, "introduction")
      ? readOptionalText(fd, "introduction")
      : undefined;

    const courseVals = readIdList(fd, "courseIds");
    const campusVals = readIdList(fd, "campusIds");
    const genreVals = readIdList(fd, "genreIds");

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

    await prisma.$transaction(async (tx) => {
      const data: any = { label, slug, sortOrder, isActive };
      if (charmTags !== undefined) data.charmTags = charmTags;
      if (introduction !== undefined) data.introduction = introduction;

      if (clearPhoto) {
        data.photoMime = null;
        data.photoData = null;
      } else {
        const file = fd.get("file");
        if (file && file instanceof File && file.size > 0) {
          if (file.size > MAX_IMAGE_BYTES) {
            throw new Error(
              `画像サイズが大きすぎます（上限 ${MAX_IMAGE_BYTES} bytes）`,
            );
          }
          data.photoMime = file.type || "application/octet-stream";
          const ab = await file.arrayBuffer();
          data.photoData = new Uint8Array(ab) as any;
        }
      }

      const u = await tx.diagnosisInstructor.updateMany({
        where: { id, schoolId },
        data,
      });
      if (u.count === 0) throw new Error("更新対象が見つかりません");

      // ✅ 既存リンクを全置換（course/campus/genre）
      await tx.diagnosisInstructorCourse.deleteMany({
        where: { instructorId: id, schoolId },
      });
      await tx.diagnosisInstructorCampus.deleteMany({
        where: { instructorId: id, schoolId },
      });
      await tx.diagnosisInstructorGenre.deleteMany({
        where: { instructorId: id, schoolId },
      });

      if (courseR.ids.length > 0) {
        await tx.diagnosisInstructorCourse.createMany({
          data: courseR.ids.map((courseId) => ({
            instructorId: id,
            courseId,
            schoolId,
          })),
          skipDuplicates: true,
        });
      }

      if (campusR.ids.length > 0) {
        await tx.diagnosisInstructorCampus.createMany({
          data: campusR.ids.map((campusId) => ({
            instructorId: id,
            campusId,
            schoolId,
          })),
          skipDuplicates: true,
        });
      }

      if (genreR.ids.length > 0) {
        await tx.diagnosisInstructorGenre.createMany({
          data: genreR.ids.map((genreId) => ({
            instructorId: id,
            genreId,
            schoolId,
          })),
          skipDuplicates: true,
        });
      }
    });

    const updated = await prisma.diagnosisInstructor.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        schoolId: true,
        label: true,
        slug: true,
        sortOrder: true,
        isActive: true,
        photoMime: true,
        charmTags: true,
        introduction: true,
      },
    });

    const { coursesByInstructor, campusesByInstructor, genresByInstructor } =
      await fetchLinks(schoolId, [id]);

    const courses = coursesByInstructor.get(id) ?? [];
    const campuses = campusesByInstructor.get(id) ?? [];
    const genres = genresByInstructor.get(id) ?? [];

    return NextResponse.json({
      ...updated,
      photoMime: updated?.photoMime ?? null,
      charmTags: updated?.charmTags ?? null,
      introduction: updated?.introduction ?? null,
      courses,
      campuses,
      genres,
      courseIds: courses.map((c: any) => c.id),
      campusIds: campuses.map((c: any) => c.id),
      genreIds: genres.map((g: any) => g.id),
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

    const schoolId =
      searchParams.get("schoolId")?.trim() ||
      String((session.user as any)?.schoolId ?? "").trim();

    if (!id || !schoolId) return json("id / schoolId が必要です", 400);

    const existing = await prisma.diagnosisInstructor.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!existing) return json("対象が見つかりません", 404);

    const u = await prisma.diagnosisInstructor.updateMany({
      where: { id, schoolId },
      data: { isActive: false },
    });
    if (u.count === 0) return json("対象が見つかりません", 404);

    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    console.error(e);
    return json(e?.message ?? "無効化に失敗しました", 500);
  }
}
