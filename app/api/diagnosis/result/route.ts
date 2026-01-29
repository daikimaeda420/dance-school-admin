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

/**
 * Qx の選択肢から option.tag を取り出す（Lv0_超入門 / Age_Adult_Work / Style_Healing など）
 * ※ answers[Qx] は option.id なので QUESTIONS から引き直す
 */
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

/**
 * Q4 の選択肢から genreTag を取り出す（DBのDiagnosisGenreはもう引かない）
 * 例: Genre_KPOP / Genre_HIPHOP ...
 */
function getGenreTagFromAnswers(answers: Record<string, string>): string {
  const q4 = QUESTIONS.find((q) => q.id === "Q4");
  const optionId = answers["Q4"];
  const opt = q4?.options.find((o) => o.id === optionId);
  return (opt as any)?.tag ?? "Genre_All";
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
  genre?: string[]; // ✅ tag（Genre_KPOPなど）で判定
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
    genreTag: string; // ✅ tag
    q2ForCourse: string;
    recommendedCourseSlug: string | null;
  },
): boolean {
  if (!includesOrEmpty(cond.campus, ctx.campusSlug)) return false;

  // ✅ cond.genre は tag（Genre_KPOP等）で判定
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
// ✅ ここから「中間テーブルで instructorIds を絞る」ヘルパー
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

    // =========================================================
    // ✅ Q4: DBのDiagnosisGenreはもう使わない
    // =========================================================
    const q4Meta = getQ4Meta(answers);
    const genreTag = q4Meta.tag; // Genre_KPOP 等（Genre_All含む）

    // Q2に紐づく「おすすめコース」
    const q2ForCourse = getQ2ValueForCourse(answers);

    const recommendedCourse = await prisma.diagnosisCourse.findFirst({
      where: {
        schoolId,
        isActive: true,
        q2AnswerTags: { has: q2ForCourse },
      },
      orderBy: { sortOrder: "asc" },
      // ✅ Bytes(photoData)は取らない（重い & URLで配信する）
      select: {
        id: true,
        label: true,
        slug: true,
        answerTag: true,
        photoMime: true, // hasImage判定用（厳密性が必要なら別設計）
      },
    });

    // 診断結果決定
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

    // 1) 条件マッチ
    let best = candidates.find((r) =>
      matchesConditions(parseConditions(r.conditions), ctx),
    );

    // 2) fallback
    if (!best) best = candidates.find((r) => r.isFallback) ?? null;

    // 3) 保険
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

    // ==========================
    // ✅ 講師取得（新: campus+course → campus）
    // ==========================
    const campusInstructorIds = await instructorIdsByCampus({
      schoolId,
      campusId: campus.id,
    });

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
    let instructorMatchedBy: "campus+course" | "campus" | "none" = "none";

    // ① campus + course
    if (recommendedCourse?.id) {
      const courseIds = await instructorIdsByCourse({
        schoolId,
        courseId: recommendedCourse.id,
      });
      const ids = intersectIds(campusInstructorIds, courseIds);

      if (ids.length > 0) {
        instructors = await prisma.diagnosisInstructor.findMany({
          where: { schoolId, isActive: true, id: { in: ids } },
          orderBy: { sortOrder: "asc" },
          select: selectInstructor,
        });
        if (instructors.length > 0) instructorMatchedBy = "campus+course";
      }
    }

    // ② campus only
    if (instructors.length === 0) {
      if (campusInstructorIds.length > 0) {
        instructors = await prisma.diagnosisInstructor.findMany({
          where: { schoolId, isActive: true, id: { in: campusInstructorIds } },
          orderBy: { sortOrder: "asc" },
          select: selectInstructor,
        });
        if (instructors.length > 0) instructorMatchedBy = "campus";
      }
    }

    if (instructors.length === 0) instructorMatchedBy = "none";

    // ==========================
    // ✅ resultCopy（concern は必ず文字列）
    // ==========================
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

    // ✅ コース画像URL（photoMimeがあれば表示対象）
    const courseHasPhoto = Boolean(recommendedCourse?.photoMime);
    const coursePhotoUrl =
      recommendedCourse?.id && courseHasPhoto
        ? `/api/diagnosis/courses/photo?schoolId=${encodeURIComponent(
            schoolId,
          )}&id=${encodeURIComponent(recommendedCourse.id)}`
        : null;

    return NextResponse.json({
      pattern: "A",
      patternMessage: null,
      score: 100,
      headerLabel: "あなたにおすすめの理由",

      bestMatch: {
        classId: best.id,
        className: recommendedCourse?.label ?? best.title,
        // ✅ 互換：genres は Q4ラベルを詰める（空でもOK）
        genres: q4Meta.label ? [q4Meta.label] : [],
        levels: [],
        targets: [],
      },

      // ✅ 新：Embedが参照する（画像含む）
      selectedCourse: recommendedCourse
        ? {
            id: recommendedCourse.id,
            label: recommendedCourse.label,
            slug: recommendedCourse.slug,
            answerTag: recommendedCourse.answerTag ?? null,
            photoUrl: coursePhotoUrl,
          }
        : null,

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

      // ✅ 旧selectedGenre(DB)は廃止。Embed互換：answerTagフィールド名で返す
      selectedGenre: {
        id: q4Meta.id,
        label: q4Meta.label,
        slug: q4Meta.tag, // 互換のためslug相当としてtagを入れておく
        answerTag: q4Meta.tag,
      },

      debug: {
        ctx,
        campusId: campus.id,
        genreTag,
        recommendedCourseId: recommendedCourse?.id ?? null,
        instructorMatchedBy,
        instructorsCount: instructors.length,
        copyKeys: {
          levelTag,
          ageTag,
          teacherTag,
          concernKey,
        },
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
