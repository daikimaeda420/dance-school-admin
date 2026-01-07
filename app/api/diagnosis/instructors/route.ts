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

function uniq(arr: string[]) {
  return Array.from(
    new Set(arr.map((s) => String(s ?? "").trim()).filter(Boolean))
  );
}

type ResolveKind = "campus" | "course" | "genre";

/**
 * ✅ id/slug/answerTag/label が混在していても「存在する実ID」に解決する
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
        isActive: true,
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
      found.flatMap((r) => [r.id, r.slug, r.label].filter(Boolean) as string[])
    );
    const missing = values.filter((v) => !foundKeys.has(v));
    return { ids, missing };
  }

  if (params.kind === "course") {
    const found = await prisma.diagnosisCourse.findMany({
      where: {
        schoolId,
        isActive: true,
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
      found.flatMap((r) => [r.id, r.slug, r.label].filter(Boolean) as string[])
    );
    const missing = values.filter((v) => !foundKeys.has(v));
    return { ids, missing };
  }

  // genre
  const found = await prisma.diagnosisGenre.findMany({
    where: {
      schoolId,
      isActive: true,
      OR: [
        { id: { in: values } },
        { slug: { in: values } },
        { answerTag: { in: values } },
        { label: { in: values } },
      ],
    },
    select: { id: true, slug: true, answerTag: true, label: true },
  });

  const ids = uniq(found.map((r) => r.id));
  const foundKeys = new Set(
    found.flatMap(
      (r) => [r.id, r.slug, r.answerTag, r.label].filter(Boolean) as string[]
    )
  );
  const missing = values.filter((v) => !foundKeys.has(v));
  return { ids, missing };
}

/**
 * ✅ 明示中間（DiagnosisInstructorCourse/Genre/Campus）からまとめて返す
 * ※ Prismaの relation フィールド名に依存しない（= buildが安定）
 */
async function fetchLinks(schoolId: string, instructorIds: string[]) {
  if (instructorIds.length === 0) {
    return {
      coursesByInstructor: new Map<string, any[]>(),
      genresByInstructor: new Map<string, any[]>(),
      campusesByInstructor: new Map<string, any[]>(),
    };
  }

  const [courseLinks, genreLinks, campusLinks] = await Promise.all([
    prisma.diagnosisInstructorCourse.findMany({
      where: { schoolId, instructorId: { in: instructorIds } },
      select: { instructorId: true, courseId: true },
    }),
    prisma.diagnosisInstructorGenre.findMany({
      where: { schoolId, instructorId: { in: instructorIds } },
      select: { instructorId: true, genreId: true },
    }),
    prisma.diagnosisInstructorCampus.findMany({
      where: { schoolId, instructorId: { in: instructorIds } },
      select: { instructorId: true, campusId: true },
    }),
  ]);

  const courseIds = Array.from(new Set(courseLinks.map((x) => x.courseId)));
  const genreIds = Array.from(new Set(genreLinks.map((x) => x.genreId)));
  const campusIds = Array.from(new Set(campusLinks.map((x) => x.campusId)));

  const [courses, genres, campuses] = await Promise.all([
    courseIds.length
      ? prisma.diagnosisCourse.findMany({
          where: { id: { in: courseIds } },
          select: { id: true, label: true, slug: true },
        })
      : Promise.resolve([]),
    genreIds.length
      ? prisma.diagnosisGenre.findMany({
          where: { id: { in: genreIds } },
          select: { id: true, label: true, slug: true, answerTag: true },
        })
      : Promise.resolve([]),
    campusIds.length
      ? prisma.diagnosisCampus.findMany({
          where: { id: { in: campusIds } },
          select: {
            id: true,
            label: true,
            slug: true,
            isActive: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const genreMap = new Map(genres.map((g) => [g.id, g]));
  const campusMap = new Map(campuses.map((c) => [c.id, c]));

  const coursesByInstructor = new Map<string, any[]>();
  for (const row of courseLinks) {
    const c = courseMap.get(row.courseId);
    if (!c) continue;
    const cur = coursesByInstructor.get(row.instructorId) ?? [];
    cur.push(c);
    coursesByInstructor.set(row.instructorId, cur);
  }

  const genresByInstructor = new Map<string, any[]>();
  for (const row of genreLinks) {
    const g = genreMap.get(row.genreId);
    if (!g) continue;
    const cur = genresByInstructor.get(row.instructorId) ?? [];
    cur.push(g);
    genresByInstructor.set(row.instructorId, cur);
  }

  const campusesByInstructor = new Map<string, any[]>();
  for (const row of campusLinks) {
    const c = campusMap.get(row.campusId);
    if (!c) continue;
    const cur = campusesByInstructor.get(row.instructorId) ?? [];
    cur.push(c);
    campusesByInstructor.set(row.instructorId, cur);
  }

  return { coursesByInstructor, genresByInstructor, campusesByInstructor };
}

function readOptionalText(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? "").trim();
  return v ? v : null;
}

/** ✅ “送られてきたかどうか” を判定して PUT で null 上書きを防ぐ */
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
        charmTags: true,
        introduction: true,
      },
    });

    const instructorIds = rows.map((r) => r.id);
    const { coursesByInstructor, genresByInstructor, campusesByInstructor } =
      await fetchLinks(schoolId, instructorIds);

    return NextResponse.json(
      rows.map((r) => {
        const courses = coursesByInstructor.get(r.id) ?? [];
        const genres = genresByInstructor.get(r.id) ?? [];
        const campuses = campusesByInstructor.get(r.id) ?? [];
        return {
          ...r,
          photoMime: r.photoMime ?? null,
          charmTags: r.charmTags ?? null,
          introduction: r.introduction ?? null,
          courses,
          genres,
          campuses,
          courseIds: courses.map((c: any) => c.id),
          genreIds: genres.map((g: any) => g.id),
          campusIds: campuses.map((c: any) => c.id),
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

    const charmTags = readOptionalText(fd, "charmTags");
    const introduction = readOptionalText(fd, "introduction");

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

    if (campusVals.length > 0 && campusR.ids.length === 0) {
      return NextResponse.json(
        {
          message:
            "紐づけようとした校舎が見つかりません（id/slug/label・schoolId・isActive を確認）",
          debug: { campusVals, missing: campusR.missing },
        },
        { status: 400 }
      );
    }
    if (courseVals.length > 0 && courseR.ids.length === 0) {
      return NextResponse.json(
        {
          message:
            "紐づけようとしたコースが見つかりません（id/slug/label・schoolId・isActive を確認）",
          debug: { courseVals, missing: courseR.missing },
        },
        { status: 400 }
      );
    }
    if (genreVals.length > 0 && genreR.ids.length === 0) {
      return NextResponse.json(
        {
          message:
            "紐づけようとしたジャンルが見つかりません（id/slug/answerTag/label・schoolId・isActive を確認）",
          debug: { genreVals, missing: genreR.missing },
        },
        { status: 400 }
      );
    }

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

      return created;
    });

    const { coursesByInstructor, genresByInstructor, campusesByInstructor } =
      await fetchLinks(schoolId, [instructor.id]);

    const courses = coursesByInstructor.get(instructor.id) ?? [];
    const genres = genresByInstructor.get(instructor.id) ?? [];
    const campuses = campusesByInstructor.get(instructor.id) ?? [];

    return NextResponse.json(
      {
        ...instructor,
        photoMime: instructor.photoMime ?? null,
        charmTags: instructor.charmTags ?? null,
        introduction: instructor.introduction ?? null,
        courses,
        genres,
        campuses,
        courseIds: courses.map((c: any) => c.id),
        genreIds: genres.map((g: any) => g.id),
        campusIds: campuses.map((c: any) => c.id),
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

    // ✅ PUTでは「送られてきたら更新」。送られてこないなら維持。
    const charmTags = hasField(fd, "charmTags")
      ? readOptionalText(fd, "charmTags")
      : undefined;
    const introduction = hasField(fd, "introduction")
      ? readOptionalText(fd, "introduction")
      : undefined;

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

    if (campusVals.length > 0 && campusR.ids.length === 0) {
      return NextResponse.json(
        {
          message:
            "紐づけようとした校舎が見つかりません（id/slug/label・schoolId・isActive を確認）",
          debug: { campusVals, missing: campusR.missing },
        },
        { status: 400 }
      );
    }
    if (courseVals.length > 0 && courseR.ids.length === 0) {
      return NextResponse.json(
        {
          message:
            "紐づけようとしたコースが見つかりません（id/slug/label・schoolId・isActive を確認）",
          debug: { courseVals, missing: courseR.missing },
        },
        { status: 400 }
      );
    }
    if (genreVals.length > 0 && genreR.ids.length === 0) {
      return NextResponse.json(
        {
          message:
            "紐づけようとしたジャンルが見つかりません（id/slug/answerTag/label・schoolId・isActive を確認）",
          debug: { genreVals, missing: genreR.missing },
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // 基本情報
      const data: any = {
        label,
        slug,
        sortOrder,
        isActive,
      };

      // ✅ 送られてきた場合のみ反映（null許容）
      if (charmTags !== undefined) data.charmTags = charmTags;
      if (introduction !== undefined) data.introduction = introduction;

      // 画像
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

      // 既存リンクを全置換
      await tx.diagnosisInstructorCourse.deleteMany({
        where: { instructorId: existing.id, schoolId },
      });
      await tx.diagnosisInstructorGenre.deleteMany({
        where: { instructorId: existing.id, schoolId },
      });
      await tx.diagnosisInstructorCampus.deleteMany({
        where: { instructorId: existing.id, schoolId },
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
    });

    const updated = await prisma.diagnosisInstructor.findUnique({
      where: { id: existing.id },
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

    const { coursesByInstructor, genresByInstructor, campusesByInstructor } =
      await fetchLinks(schoolId, [existing.id]);

    const courses = coursesByInstructor.get(existing.id) ?? [];
    const genres = genresByInstructor.get(existing.id) ?? [];
    const campuses = campusesByInstructor.get(existing.id) ?? [];

    return NextResponse.json({
      ...updated,
      photoMime: updated?.photoMime ?? null,
      charmTags: updated?.charmTags ?? null,
      introduction: updated?.introduction ?? null,
      courses,
      genres,
      campuses,
      courseIds: courses.map((c: any) => c.id),
      genreIds: genres.map((g: any) => g.id),
      campusIds: campuses.map((c: any) => c.id),
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
