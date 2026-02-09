// app/api/diagnosis/instructors/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { QUESTIONS } from "@/lib/diagnosis/config";

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
 * courseIds / campusIds / genreIds / q4OptionIds / q6OptionIds などを柔軟に受け取る
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

type ResolveKind = "campus" | "course";

function q4LabelMap() {
  const q4 = QUESTIONS.find((q) => q.id === "Q4");
  const map = new Map<string, string>();
  for (const o of q4?.options ?? []) {
    map.set(String(o.id), String(o.label));
  }
  return map;
}

function q6LabelMap() {
  const q6 = QUESTIONS.find((q) => q.id === "Q6");
  const map = new Map<string, string>();
  for (const o of q6?.options ?? []) {
    map.set(String(o.id), String(o.label));
  }
  return map;
}

/** ✅ Q4の選択肢として「許可された optionId」だけに正規化 */
function normalizeQ4OptionIds(input: string[]) {
  const map = q4LabelMap();
  const allow = new Set(Array.from(map.keys()));
  const cleaned = uniq(input);
  return cleaned.filter((v) => allow.has(v));
}

/** ✅ Q6の選択肢として「許可された optionId」だけに正規化 */
function normalizeQ6OptionIds(input: string[]) {
  const map = q6LabelMap();
  const allow = new Set(Array.from(map.keys()));
  const cleaned = uniq(input);
  return cleaned.filter((v) => allow.has(v));
}

function toStrArray(v: any): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string") return [v].filter(Boolean);
  return [];
}

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

  // course
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

/**
 * ✅ 明示中間（Course/Campus） + ✅ Q4 option + ✅ Q6 option の紐づけを返す
 *
 * NOTE:
 * - prisma.diagnosisInstructorQ6Option が存在する前提です（Q4と同じ中間テーブル）
 *   fields: schoolId, instructorId, optionId
 */
async function fetchLinks(schoolId: string, instructorIds: string[]) {
  if (instructorIds.length === 0) {
    return {
      coursesByInstructor: new Map<string, any[]>(),
      campusesByInstructor: new Map<string, any[]>(),
      q4ByInstructor: new Map<string, string[]>(),
      q6ByInstructor: new Map<string, string[]>(),
    };
  }

  const [courseLinks, campusLinks, q4Links, q6Links] = await Promise.all([
    prisma.diagnosisInstructorCourse.findMany({
      where: { schoolId, instructorId: { in: instructorIds } },
      select: { instructorId: true, courseId: true },
    }),
    prisma.diagnosisInstructorCampus.findMany({
      where: { schoolId, instructorId: { in: instructorIds } },
      select: { instructorId: true, campusId: true },
    }),
    prisma.diagnosisInstructorQ4Option.findMany({
      where: { schoolId, instructorId: { in: instructorIds } },
      select: { instructorId: true, optionId: true },
    }),
    prisma.diagnosisInstructorQ6Option.findMany({
      where: { schoolId, instructorId: { in: instructorIds } },
      select: { instructorId: true, optionId: true },
    }),
  ]);

  const courseIds = Array.from(new Set(courseLinks.map((x) => x.courseId)));
  const campusIds = Array.from(new Set(campusLinks.map((x) => x.campusId)));

  const [courses, campuses] = await Promise.all([
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
  ]);

  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const campusMap = new Map(campuses.map((c) => [c.id, c]));

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

  const q4ByInstructor = new Map<string, string[]>();
  for (const row of q4Links) {
    const cur = q4ByInstructor.get(row.instructorId) ?? [];
    cur.push(String(row.optionId));
    q4ByInstructor.set(row.instructorId, Array.from(new Set(cur)));
  }

  const q6ByInstructor = new Map<string, string[]>();
  for (const row of q6Links) {
    const cur = q6ByInstructor.get(row.instructorId) ?? [];
    cur.push(String(row.optionId));
    q6ByInstructor.set(row.instructorId, Array.from(new Set(cur)));
  }

  return {
    coursesByInstructor,
    campusesByInstructor,
    q4ByInstructor,
    q6ByInstructor,
  };
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
    const {
      coursesByInstructor,
      campusesByInstructor,
      q4ByInstructor,
      q6ByInstructor,
    } = await fetchLinks(schoolId, instructorIds);

    const q4Map = q4LabelMap();
    const q6Map = q6LabelMap();

    return NextResponse.json(
      rows.map((r) => {
        const courses = coursesByInstructor.get(r.id) ?? [];
        const campuses = campusesByInstructor.get(r.id) ?? [];

        // ✅ Q4 option ids
        const q4OptionIds = q4ByInstructor.get(r.id) ?? [];
        // ✅ Q6 option ids
        const q6OptionIds = q6ByInstructor.get(r.id) ?? [];

        // ✅ フロント表示用：genres に「Q4選択肢」
        const q4Options = q4OptionIds.map((oid) => ({
          id: oid,
          label: q4Map.get(oid) ?? oid,
          slug: oid,
        }));

        // ✅ フロント表示用：concerns に「Q6選択肢」
        const q6Options = q6OptionIds.map((oid) => ({
          id: oid,
          label: q6Map.get(oid) ?? oid,
          slug: oid,
        }));

        return {
          ...r,
          photoMime: r.photoMime ?? null,
          charmTags: r.charmTags ?? null,
          introduction: r.introduction ?? null,

          courses,
          campuses,

          // ✅ 重要：genres は Q4選択肢
          genres: q4Options,

          // ✅ 追加：concerns は Q6選択肢
          concerns: q6Options,

          courseIds: courses.map((c: any) => c.id),
          campusIds: campuses.map((c: any) => c.id),

          // ✅ 互換：フロントが genreIds を見ててもOK
          genreIds: q4OptionIds,
          // ✅ 互換：フロントが concernIds を見ててもOK
          concernIds: q6OptionIds,

          // ✅ 将来用：正式キー
          q4OptionIds,
          q6OptionIds,
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

    // ✅ Q4（雰囲気）互換：genreIdsでも来る
    const q4ValsRaw = uniq([
      ...readIdList(fd, "q4OptionIds"),
      ...readIdList(fd, "genreIds"),
    ]);
    const q4Vals = normalizeQ4OptionIds(q4ValsRaw);

    // ✅ Q6（一番の不安）互換：concernIdsでも来る
    const q6ValsRaw = uniq([
      ...readIdList(fd, "q6OptionIds"),
      ...readIdList(fd, "concernIds"),
    ]);
    const q6Vals = normalizeQ6OptionIds(q6ValsRaw);

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

    const [campusR, courseR] = await Promise.all([
      resolveConnectIds({ schoolId, kind: "campus", values: campusVals }),
      resolveConnectIds({ schoolId, kind: "course", values: courseVals }),
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

      // ✅ Q4保存
      if (q4Vals.length > 0) {
        await tx.diagnosisInstructorQ4Option.createMany({
          data: q4Vals.map((optionId) => ({
            instructorId: created.id,
            schoolId,
            optionId,
          })),
          skipDuplicates: true,
        });
      }

      // ✅ Q6保存
      if (q6Vals.length > 0) {
        await tx.diagnosisInstructorQ6Option.createMany({
          data: q6Vals.map((optionId) => ({
            instructorId: created.id,
            schoolId,
            optionId,
          })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    // 返却整形（GETと同じ形式）
    const {
      coursesByInstructor,
      campusesByInstructor,
      q4ByInstructor,
      q6ByInstructor,
    } = await fetchLinks(schoolId, [instructor.id]);

    const courses = coursesByInstructor.get(instructor.id) ?? [];
    const campuses = campusesByInstructor.get(instructor.id) ?? [];
    const q4OptionIds = q4ByInstructor.get(instructor.id) ?? [];
    const q6OptionIds = q6ByInstructor.get(instructor.id) ?? [];

    const q4Map = q4LabelMap();
    const q6Map = q6LabelMap();

    const q4Options = q4OptionIds.map((oid) => ({
      id: oid,
      label: q4Map.get(oid) ?? oid,
      slug: oid,
    }));

    const q6Options = q6OptionIds.map((oid) => ({
      id: oid,
      label: q6Map.get(oid) ?? oid,
      slug: oid,
    }));

    return NextResponse.json(
      {
        ...instructor,
        photoMime: instructor.photoMime ?? null,
        charmTags: instructor.charmTags ?? null,
        introduction: instructor.introduction ?? null,
        courses,
        campuses,
        genres: q4Options,
        concerns: q6Options,
        courseIds: courses.map((c: any) => c.id),
        campusIds: campuses.map((c: any) => c.id),
        genreIds: q4OptionIds,
        concernIds: q6OptionIds,
        q4OptionIds,
        q6OptionIds,
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

    const q4ValsRaw = uniq([
      ...readIdList(fd, "q4OptionIds"),
      ...readIdList(fd, "genreIds"),
    ]);
    const q4Vals = normalizeQ4OptionIds(q4ValsRaw);

    const q6ValsRaw = uniq([
      ...readIdList(fd, "q6OptionIds"),
      ...readIdList(fd, "concernIds"),
    ]);
    const q6Vals = normalizeQ6OptionIds(q6ValsRaw);

    if (!id || !schoolId || !label || !slug) {
      return json("id / schoolId / label / slug は必須です", 400);
    }

    const existing = await prisma.diagnosisInstructor.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!existing) return json("対象が見つかりません", 404);

    const [campusR, courseR] = await Promise.all([
      resolveConnectIds({ schoolId, kind: "campus", values: campusVals }),
      resolveConnectIds({ schoolId, kind: "course", values: courseVals }),
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

      // ✅ course/campus は全置換
      await tx.diagnosisInstructorCourse.deleteMany({
        where: { instructorId: id, schoolId },
      });
      await tx.diagnosisInstructorCampus.deleteMany({
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

      // ✅ Q4は全置換
      await tx.diagnosisInstructorQ4Option.deleteMany({
        where: { instructorId: id, schoolId },
      });
      if (q4Vals.length > 0) {
        await tx.diagnosisInstructorQ4Option.createMany({
          data: q4Vals.map((optionId) => ({
            instructorId: id,
            schoolId,
            optionId,
          })),
          skipDuplicates: true,
        });
      }

      // ✅ Q6は全置換
      await tx.diagnosisInstructorQ6Option.deleteMany({
        where: { instructorId: id, schoolId },
      });
      if (q6Vals.length > 0) {
        await tx.diagnosisInstructorQ6Option.createMany({
          data: q6Vals.map((optionId) => ({
            instructorId: id,
            schoolId,
            optionId,
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

    const {
      coursesByInstructor,
      campusesByInstructor,
      q4ByInstructor,
      q6ByInstructor,
    } = await fetchLinks(schoolId, [id]);

    const courses = coursesByInstructor.get(id) ?? [];
    const campuses = campusesByInstructor.get(id) ?? [];
    const q4OptionIds = q4ByInstructor.get(id) ?? [];
    const q6OptionIds = q6ByInstructor.get(id) ?? [];

    const q4Map = q4LabelMap();
    const q6Map = q6LabelMap();

    const q4Options = q4OptionIds.map((oid) => ({
      id: oid,
      label: q4Map.get(oid) ?? oid,
      slug: oid,
    }));

    const q6Options = q6OptionIds.map((oid) => ({
      id: oid,
      label: q6Map.get(oid) ?? oid,
      slug: oid,
    }));

    return NextResponse.json({
      ...updated,
      photoMime: updated?.photoMime ?? null,
      charmTags: updated?.charmTags ?? null,
      introduction: updated?.introduction ?? null,
      courses,
      campuses,
      genres: q4Options,
      concerns: q6Options,
      courseIds: courses.map((c: any) => c.id),
      campusIds: campuses.map((c: any) => c.id),
      genreIds: q4OptionIds,
      concernIds: q6OptionIds,
      q4OptionIds,
      q6OptionIds,
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
