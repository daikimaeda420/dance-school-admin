import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  QUESTIONS,
  concernMessages,
  ConcernMessageKey,
} from "@/lib/diagnosis/config";

type DiagnosisRequestBody = {
  schoolId?: string;
  answers?: Record<string, string>;
};

const REQUIRED_QUESTION_IDS = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"] as const;

function getConcernKey(answers: Record<string, string>): ConcernMessageKey {
  const q6 = QUESTIONS.find((q) => q.id === "Q6");
  const optionId = answers["Q6"];
  const opt = q6?.options.find((o) => o.id === optionId);
  const key = opt?.messageKey ?? "Msg_Consult";
  return key as ConcernMessageKey;
}

function getGenreTagFromAnswers(answers: Record<string, string>): string {
  const q4 = QUESTIONS.find((q) => q.id === "Q4");
  const optionId = answers["Q4"];
  const opt = q4?.options.find((o) => o.id === optionId);
  return opt?.tag ?? "Genre_All";
}

function mapGenreTagToGenreSlug(tag: string): string | null {
  switch (tag) {
    case "Genre_KPOP":
      return "kpop";
    case "Genre_HIPHOP":
      return "hiphop";
    case "Genre_JAZZ":
      return "jazz";
    case "Genre_ThemePark":
      return "themepark";
    case "Genre_All":
    default:
      return null;
  }
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
  genre?: string[];
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
    genreSlug: string | null;
    q2ForCourse: string;
    recommendedCourseSlug: string | null;
  }
): boolean {
  if (!includesOrEmpty(cond.campus, ctx.campusSlug)) return false;
  if (!includesOrEmpty(cond.genre, ctx.genreSlug)) return false;

  if (cond.q2Tags && cond.q2Tags.length > 0) {
    if (!cond.q2Tags.includes(ctx.q2ForCourse)) return false;
  }

  if (cond.courseSlug && cond.courseSlug.length > 0) {
    if (!ctx.recommendedCourseSlug) return false;
    if (!cond.courseSlug.includes(ctx.recommendedCourseSlug)) return false;
  }

  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body: DiagnosisRequestBody = await req.json().catch(() => ({}));
    const schoolId = body.schoolId ?? "";
    const answers = body.answers ?? {};

    if (!schoolId) {
      return NextResponse.json(
        { error: "NO_SCHOOL_ID", message: "schoolId が指定されていません。" },
        { status: 400 }
      );
    }

    const missing = REQUIRED_QUESTION_IDS.filter((id) => !answers[id]);
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: "MISSING_ANSWERS",
          message: `未回答の質問があります: ${missing.join(", ")}`,
        },
        { status: 400 }
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
        isOnline: true,
        address: true,
        access: true,
        googleMapUrl: true,
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
        { status: 400 }
      );
    }

    // Q4: genre (optional)
    const genreTag = getGenreTagFromAnswers(answers);
    const genreSlug = mapGenreTagToGenreSlug(genreTag);

    const genre =
      genreSlug === null
        ? null
        : await prisma.diagnosisGenre.findFirst({
            where: { schoolId, slug: genreSlug, isActive: true },
            select: { id: true, label: true, slug: true },
          });

    if (genreSlug !== null && !genre) {
      return NextResponse.json(
        {
          error: "NO_GENRE",
          message:
            "選択したジャンルが見つかりません（管理画面の登録/有効化を確認してください）。",
          debug: { genreTag, genreSlug },
        },
        { status: 400 }
      );
    }

    // Q2に紐づく「おすすめコース」
    const q2ForCourse = getQ2ValueForCourse(answers);

    const recommendedCourse = await prisma.diagnosisCourse.findFirst({
      where: {
        schoolId,
        isActive: true,
        q2AnswerTags: { has: q2ForCourse },
      },
      orderBy: { sortOrder: "asc" },
      select: { id: true, label: true, slug: true },
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
      genreSlug: genre?.slug ?? null,
      q2ForCourse,
      recommendedCourseSlug: recommendedCourse?.slug ?? null,
    };

    // 1) 条件マッチ
    let best = candidates.find((r) =>
      matchesConditions(parseConditions(r.conditions), ctx)
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
        { status: 400 }
      );
    }

    // ==========================
    // ✅ 講師取得（段階的に緩める）
    // ==========================
    const baseWhere = {
      schoolId,
      isActive: true,
      campuses: { some: { campusId: campus.id } }, // 校舎は必須
    } as const;

    const selectInstructor = {
      id: true,
      label: true,
      slug: true,
    } as const;

    let instructors =
      (genre?.id && recommendedCourse?.id
        ? await prisma.diagnosisInstructor.findMany({
            where: {
              ...baseWhere,
              genres: { some: { genreId: genre.id } },
              courses: { some: { courseId: recommendedCourse.id } },
            },
            orderBy: { sortOrder: "asc" },
            select: selectInstructor,
          })
        : []) ?? [];

    let instructorMatchedBy:
      | "campus+genre+course"
      | "campus+genre"
      | "campus+course"
      | "campus"
      | "none" = "none";

    if (instructors.length > 0) {
      instructorMatchedBy = "campus+genre+course";
    } else if (genre?.id) {
      instructors = await prisma.diagnosisInstructor.findMany({
        where: {
          ...baseWhere,
          genres: { some: { genreId: genre.id } },
        },
        orderBy: { sortOrder: "asc" },
        select: selectInstructor,
      });
      if (instructors.length > 0) instructorMatchedBy = "campus+genre";
    }

    if (instructors.length === 0 && recommendedCourse?.id) {
      instructors = await prisma.diagnosisInstructor.findMany({
        where: {
          ...baseWhere,
          courses: { some: { courseId: recommendedCourse.id } },
        },
        orderBy: { sortOrder: "asc" },
        select: selectInstructor,
      });
      if (instructors.length > 0) instructorMatchedBy = "campus+course";
    }

    if (instructors.length === 0) {
      instructors = await prisma.diagnosisInstructor.findMany({
        where: baseWhere,
        orderBy: { sortOrder: "asc" },
        select: selectInstructor,
      });
      if (instructors.length > 0) instructorMatchedBy = "campus";
    }

    if (instructors.length === 0) instructorMatchedBy = "none";

    const concernKey = getConcernKey(answers);
    const concernMessage = concernMessages[concernKey];

    return NextResponse.json({
      pattern: "A",
      patternMessage: null,
      score: 100,
      headerLabel: "あなたにおすすめの診断結果です",

      bestMatch: {
        classId: best.id, // 互換
        className: recommendedCourse?.label ?? best.title,
        genres: genre ? [genre.label] : [],
        levels: [],
        targets: [],
      },

      teacher: {
        id: undefined,
        name: undefined,
        photoUrl: null,
        styles: [],
      },

      // ✅ 追加：講師管理で紐づいた講師
      instructors: instructors.map((t) => ({
        id: t.id,
        label: t.label,
        slug: t.slug,
      })),

      breakdown: [],
      worstMatch: null,
      concernMessage,

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
        isOnline: campus.isOnline,
        address: campus.address ?? null,
        access: campus.access ?? null,
        googleMapUrl: campus.googleMapUrl ?? null,
      },

      // ✅ デバッグ（必要な間だけ）
      debug: {
        ctx,
        campusId: campus.id,
        genreId: genre?.id ?? null,
        recommendedCourseId: recommendedCourse?.id ?? null,
        instructorMatchedBy,
        instructorsCount: instructors.length,
      },
    });
  } catch (e: any) {
    console.error("[POST /api/diagnosis/result] error", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: e?.message ?? "サーバーエラー" },
      { status: 500 }
    );
  }
}
