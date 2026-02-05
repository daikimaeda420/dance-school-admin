// app/api/diagnosis/result/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  QUESTIONS,
  concernMessages,
  ConcernMessageKey,
} from "@/lib/diagnosis/config";
import {
  LEVEL_RESULT_COPY,
  AGE_RESULT_COPY,
  TEACHER_RESULT_COPY,
  CONCERN_RESULT_COPY,
} from "@/lib/diagnosis/resultCopy";

type DiagnosisRequestBody = {
  schoolId?: string;
  answers?: Record<string, string>;
};

const REQUIRED_QUESTION_IDS = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"] as const;

function getConcernKey(answers: Record<string, string>): ConcernMessageKey {
  const q6 = QUESTIONS.find((q) => q.id === "Q6");
  const optionId = answers["Q6"];
  const opt = q6?.options.find((o) => o.id === optionId);
  const key = (opt as any)?.messageKey ?? "Msg_Consult";
  return key as ConcernMessageKey;
}

function getOptionTagFromAnswers(
  questionId: string,
  answers: Record<string, string>,
): string | null {
  const q = QUESTIONS.find((q) => q.id === questionId);
  const optionId = answers[questionId];
  const opt = q?.options.find((o: any) => o.id === optionId) as any;
  const tag = opt?.tag;
  return typeof tag === "string" && tag.trim() ? tag.trim() : null;
}

function getQ4Meta(answers: Record<string, string>): {
  id: string;
  label: string | null;
  tag: string;
} {
  const q4 = QUESTIONS.find((q) => q.id === "Q4");
  const optionId = answers["Q4"];
  const opt: any = q4?.options.find((o: any) => o.id === optionId);
  return {
    id: String(optionId ?? ""),
    label: typeof opt?.label === "string" ? opt.label : null,
    tag: typeof opt?.tag === "string" ? opt.tag : "Genre_All",
  };
}

function norm(s: unknown): string {
  return String(s ?? "").trim();
}

function getQ2ValueForCourse(answers: Record<string, string>): string {
  const raw = answers["Q2"];
  const q2 = QUESTIONS.find((q) => q.id === "Q2");
  const opt: any = q2?.options?.find((o: any) => o.id === raw);
  return norm(opt?.label ?? opt?.value ?? opt?.tag ?? raw);
}

type ResultConditions = {
  campus?: string[];
  genre?: string[]; // tag（Genre_KPOPなど）
  q2Tags?: string[];
  courseSlug?: string[];
};

function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => norm(x)).filter(Boolean);
  return [];
}

function parseConditions(raw: unknown): ResultConditions {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as any;
  return {
    campus: asArray(o.campus),
    genre: asArray(o.genre),
    q2Tags: asArray(o.q2Tags),
    courseSlug: asArray(o.courseSlug),
  };
}

function includesOrEmpty(list: string[] | undefined, value: string | null) {
  if (!list || list.length === 0) return true;
  if (!value) return false;
  return list.includes(value);
}

function matchesConditions(
  cond: ResultConditions,
  ctx: {
    campusSlug: string;
    genreTag: string;
    q2ForCourse: string;
    recommendedCourseSlug: string | null;
  },
): boolean {
  if (!includesOrEmpty(cond.campus, ctx.campusSlug)) return false;
  if (!includesOrEmpty(cond.genre, ctx.genreTag)) return false;

  if (cond.q2Tags && cond.q2Tags.length > 0) {
    if (!cond.q2Tags.includes(ctx.q2ForCourse)) return false;
  }

  if (cond.courseSlug && cond.courseSlug.length > 0) {
    if (!ctx.recommendedCourseSlug) return false;
    if (!cond.courseSlug.includes(ctx.recommendedCourseSlug)) return false;
  }

  return true;
}

// =========================
// 中間テーブルで instructorIds を絞る
// =========================
function intersectIds(a: string[], b: string[]): string[] {
  const bSet = new Set(b);
  return a.filter((x) => bSet.has(x));
}

async function instructorIdsByCampus(params: {
  schoolId: string;
  campusId: string;
}): Promise<string[]> {
  const rows = await prisma.diagnosisInstructorCampus.findMany({
    where: { schoolId: params.schoolId, campusId: params.campusId },
    select: { instructorId: true },
  });
  return rows.map((r) => r.instructorId);
}

async function instructorIdsByCourse(params: {
  schoolId: string;
  courseId: string;
}): Promise<string[]> {
  const rows = await prisma.diagnosisInstructorCourse.findMany({
    where: { schoolId: params.schoolId, courseId: params.courseId },
    select: { instructorId: true },
  });
  return rows.map((r) => r.instructorId);
}

/**
 * ✅ Q4 tag(Genre_KPOP等) -> DiagnosisGenre(answerTag) -> DiagnosisInstructorGenre で講師IDを取る
 * - Genre_All のときは「絞り込まない」ので空配列で返す（呼び出し側で分岐）
 */
async function instructorIdsByGenreTag(params: {
  schoolId: string;
  genreTag: string;
}): Promise<{ genreId: string | null; ids: string[] }> {
  const { schoolId, genreTag } = params;
  if (!genreTag || genreTag === "Genre_All") {
    return { genreId: null, ids: [] };
  }

  const genre = await prisma.diagnosisGenre.findFirst({
    where: { schoolId, isActive: true, answerTag: genreTag },
    select: { id: true, label: true, slug: true, answerTag: true },
  });

  if (!genre) {
    return { genreId: null, ids: [] };
  }

  const links = await prisma.diagnosisInstructorGenre.findMany({
    where: { schoolId, genreId: genre.id },
    select: { instructorId: true },
  });

  return { genreId: genre.id, ids: links.map((r) => r.instructorId) };
}

// =========================
// ✅ スケジュール表示用VM
// =========================
type ScheduleSlotVM = {
  id: string;
  weekday: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
  genreText: string;
  timeText: string;
  teacher: string;
  place: string;
  sortOrder: number;
};

// =========================
// POST /api/diagnosis/result
// =========================
export async function POST(req: NextRequest) {
  try {
    const body: DiagnosisRequestBody = await req.json().catch(() => ({}));
    const schoolId = body.schoolId ?? "";
    const answers = body.answers ?? {};

    if (!schoolId) {
      return NextResponse.json(
        { error: "NO_SCHOOL_ID", message: "schoolId が指定されていません。" },
        { status: 400 },
      );
    }

    const missing = REQUIRED_QUESTION_IDS.filter((id) => !answers[id]);
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: "MISSING_ANSWERS",
          message: `未回答の質問があります: ${missing.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Q1: campus slug
    const campusSlug = norm(answers["Q1"]);
    const campus = await prisma.diagnosisCampus.findFirst({
      where: { schoolId, slug: campusSlug, isActive: true },
      select: {
        id: true,
        label: true,
        slug: true,
        address: true,
        access: true,
        googleMapUrl: true,
        googleMapEmbedUrl: true,
      },
    });

    if (!campus) {
      return NextResponse.json(
        {
          error: "NO_CAMPUS",
          message:
            "選択した校舎が見つかりません（管理画面の登録/有効化を確認してください）。",
          debug: { campusSlug },
        },
        { status: 400 },
      );
    }

    // Q4: tag（Genre_KPOP等）
    const q4Meta = getQ4Meta(answers);
    const genreTag = q4Meta.tag;

    // Q2→おすすめコース
    const q2ForCourse = getQ2ValueForCourse(answers);

    const recommendedCourse = await prisma.diagnosisCourse.findFirst({
      where: {
        schoolId,
        isActive: true,
        q2AnswerTags: { has: q2ForCourse },
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        label: true,
        slug: true,
        answerTag: true,
        photoMime: true,
        photoData: true,
      },
    });

    // 診断結果候補
    const candidates = await prisma.diagnosisResult.findMany({
      where: { schoolId, isActive: true },
      orderBy: [{ priority: "desc" }, { sortOrder: "asc" }],
      select: {
        id: true,
        title: true,
        body: true,
        ctaLabel: true,
        ctaUrl: true,
        priority: true,
        isFallback: true,
        conditions: true,
      },
    });

    const ctx = {
      campusSlug: campus.slug,
      genreTag,
      q2ForCourse,
      recommendedCourseSlug: recommendedCourse?.slug ?? null,
    };

    let best = candidates.find((r) =>
      matchesConditions(parseConditions(r.conditions), ctx),
    );
    if (!best) best = candidates.find((r) => r.isFallback) ?? null;
    if (!best) best = candidates[0] ?? null;

    if (!best) {
      return NextResponse.json(
        {
          error: "NO_MATCHED_RESULT",
          message:
            "診断結果が1件も登録されていません（管理画面で診断結果を作成してください）。",
        },
        { status: 400 },
      );
    }

    // -------------------------
    // 講師取得：campus/course/genre の優先順位で絞る
    // -------------------------
    const campusInstructorIds = await instructorIdsByCampus({
      schoolId,
      campusId: campus.id,
    });

    const { genreId, ids: genreInstructorIdsRaw } =
      await instructorIdsByGenreTag({ schoolId, genreTag });

    // genreTag が Genre_All なら「絞らない」
    const useGenreFilter = Boolean(
      genreTag && genreTag !== "Genre_All" && genreId,
    );

    const selectInstructor = {
      id: true,
      label: true,
      slug: true,
      photoMime: true,
      photoData: true,
      charmTags: true,
      introduction: true,
    } as const;

    let instructors: any[] = [];
    let instructorMatchedBy:
      | "campus+course+genre"
      | "campus+genre"
      | "campus+course"
      | "campus"
      | "none" = "none";

    const loadInstructorsByIds = async (ids: string[]) => {
      if (ids.length === 0) return [];
      return prisma.diagnosisInstructor.findMany({
        where: { schoolId, isActive: true, id: { in: ids } },
        orderBy: { sortOrder: "asc" },
        select: selectInstructor,
      });
    };

    // course ids
    let courseInstructorIds: string[] = [];
    if (recommendedCourse?.id) {
      courseInstructorIds = await instructorIdsByCourse({
        schoolId,
        courseId: recommendedCourse.id,
      });
    }

    if (campusInstructorIds.length > 0) {
      // 1) campus + course + genre
      if (recommendedCourse?.id && useGenreFilter) {
        const ids = intersectIds(
          intersectIds(campusInstructorIds, courseInstructorIds),
          genreInstructorIdsRaw,
        );
        const got = await loadInstructorsByIds(ids);
        if (got.length > 0) {
          instructors = got;
          instructorMatchedBy = "campus+course+genre";
        }
      }

      // 2) campus + genre
      if (instructors.length === 0 && useGenreFilter) {
        const ids = intersectIds(campusInstructorIds, genreInstructorIdsRaw);
        const got = await loadInstructorsByIds(ids);
        if (got.length > 0) {
          instructors = got;
          instructorMatchedBy = "campus+genre";
        }
      }

      // 3) campus + course
      if (instructors.length === 0 && recommendedCourse?.id) {
        const ids = intersectIds(campusInstructorIds, courseInstructorIds);
        const got = await loadInstructorsByIds(ids);
        if (got.length > 0) {
          instructors = got;
          instructorMatchedBy = "campus+course";
        }
      }

      // 4) campus
      if (instructors.length === 0) {
        const got = await loadInstructorsByIds(campusInstructorIds);
        if (got.length > 0) {
          instructors = got;
          instructorMatchedBy = "campus";
        }
      }
    }

    if (instructors.length === 0) instructorMatchedBy = "none";

    // resultCopy
    const levelTag = getOptionTagFromAnswers("Q2", answers);
    const ageTag = getOptionTagFromAnswers("Q3", answers);
    const teacherTag = getOptionTagFromAnswers("Q5", answers);
    const concernKey = getConcernKey(answers);

    const concernText =
      CONCERN_RESULT_COPY[concernKey] ??
      concernMessages[concernKey] ??
      CONCERN_RESULT_COPY["Msg_Consult"] ??
      concernMessages["Msg_Consult"] ??
      "";

    const resultCopy = {
      level: (levelTag && LEVEL_RESULT_COPY[levelTag]) || null,
      age: (ageTag && AGE_RESULT_COPY[ageTag]) || null,
      teacher: (teacherTag && TEACHER_RESULT_COPY[teacherTag]) || null,
      concern: concernText || null,
    };

    const concernMessage = concernText || "";

    // ✅ コース画像URL（photoDataが入っている時だけ）
    const courseHasPhoto =
      Boolean(recommendedCourse?.photoMime) &&
      Boolean(recommendedCourse?.photoData) &&
      (recommendedCourse.photoData as any)?.length > 0;

    const coursePhotoUrl =
      recommendedCourse?.id && courseHasPhoto
        ? `/api/diagnosis/courses/photo?schoolId=${encodeURIComponent(
            schoolId,
          )}&id=${encodeURIComponent(recommendedCourse.id)}`
        : null;

    // ✅ スケジュール取得（選ばれたコースに紐づく枠）
    let scheduleSlots: ScheduleSlotVM[] = [];
    if (recommendedCourse?.id) {
      const slots = await prisma.diagnosisScheduleSlot.findMany({
        where: {
          schoolId,
          isActive: true,
          courses: {
            some: { courseId: recommendedCourse.id },
          },
        },
        orderBy: [
          { weekday: "asc" },
          { sortOrder: "asc" },
          { createdAt: "asc" },
        ],
      });

      scheduleSlots = slots.map((s) => ({
        id: s.id,
        weekday: s.weekday as any,
        genreText: s.genreText,
        timeText: s.timeText,
        teacher: s.teacher,
        place: s.place,
        sortOrder: s.sortOrder,
      }));
    }

    // ✅ selectedGenre はDBが見つかればそれを優先して返す（見つからなければ従来互換）
    let selectedGenreOut = {
      id: q4Meta.id,
      label: q4Meta.label,
      slug: q4Meta.tag,
      answerTag: q4Meta.tag,
    } as any;

    if (genreId) {
      const g = await prisma.diagnosisGenre.findFirst({
        where: { id: genreId, schoolId },
        select: { id: true, label: true, slug: true, answerTag: true },
      });
      if (g) {
        selectedGenreOut = {
          id: g.id,
          label: g.label,
          slug: g.slug,
          answerTag: g.answerTag,
        };
      }
    }

    return NextResponse.json({
      pattern: "A",
      patternMessage: null,
      score: 100,
      headerLabel: "あなたにおすすめの理由",

      bestMatch: {
        classId: best.id,
        className: recommendedCourse?.label ?? best.title,
        genres: q4Meta.label ? [q4Meta.label] : [],
        levels: [],
        targets: [],
      },

      selectedCourse: recommendedCourse
        ? {
            id: recommendedCourse.id,
            label: recommendedCourse.label,
            slug: recommendedCourse.slug,
            answerTag: recommendedCourse.answerTag ?? null,
            photoUrl: coursePhotoUrl,
          }
        : null,

      scheduleSlots,

      teacher: {
        id: undefined,
        name: undefined,
        photoUrl: null,
        styles: [],
      },

      instructors: instructors.map((t) => {
        const url = `/api/diagnosis/instructors/photo?schoolId=${encodeURIComponent(
          schoolId,
        )}&id=${encodeURIComponent(t.id)}`;

        const hasPhoto =
          Boolean(t.photoMime) &&
          Boolean(t.photoData) &&
          (t.photoData as any)?.length > 0;

        return {
          id: t.id,
          label: t.label,
          slug: t.slug,
          photoUrl: hasPhoto ? url : null,
          charmTags: t.charmTags ?? null,
          introduction: t.introduction ?? null,
        };
      }),

      breakdown: [],
      worstMatch: null,

      concernMessage,
      resultCopy,

      result: {
        id: best.id,
        title: best.title,
        body: best.body,
        ctaLabel: best.ctaLabel,
        ctaUrl: best.ctaUrl,
      },

      selectedCampus: {
        label: campus.label,
        slug: campus.slug,
        address: campus.address ?? null,
        access: campus.access ?? null,
        googleMapUrl: campus.googleMapUrl ?? null,
        googleMapEmbedUrl: campus.googleMapEmbedUrl ?? null,
      },

      // ✅ 互換：Embedが参照する
      selectedGenre: selectedGenreOut,

      debug: {
        ctx,
        campusId: campus.id,
        genreTag,
        genreId: genreId ?? null,
        recommendedCourseId: recommendedCourse?.id ?? null,
        instructorMatchedBy,
        instructorsCount: instructors.length,
        scheduleSlotsCount: scheduleSlots.length,
        copyKeys: { levelTag, ageTag, teacherTag, concernKey },
        concernResolved: {
          concernKey,
          hasConcernCopy: Boolean(CONCERN_RESULT_COPY[concernKey]),
          hasConcernMessage: Boolean(concernMessages[concernKey]),
          concernTextLength: concernText.length,
        },
      },
    });
  } catch (e: any) {
    console.error("[POST /api/diagnosis/result] error", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: e?.message ?? "サーバーエラー" },
      { status: 500 },
    );
  }
}
