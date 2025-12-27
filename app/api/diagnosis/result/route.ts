// app/api/diagnosis/result/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  QUESTIONS,
  concernMessages,
  ConcernMessageKey,
} from "@/lib/diagnosis/config";

/* =====================
   型定義
===================== */
type DiagnosisRequestBody = {
  schoolId?: string;
  answers?: Record<string, string>;
};

const REQUIRED_QUESTION_IDS = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"] as const;

/* =====================
   ユーティリティ
===================== */
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
    default:
      return null;
  }
}

function norm(v: unknown): string {
  return String(v ?? "").trim();
}

/**
 * Q2の回答をコース管理用の値に正規化
 */
function getQ2ValueForCourse(answers: Record<string, string>): string {
  const raw = answers["Q2"];
  const q2 = QUESTIONS.find((q) => q.id === "Q2");
  const opt: any = q2?.options?.find((o: any) => o.id === raw);
  return norm(opt?.label ?? opt?.value ?? opt?.tag ?? raw);
}

/* =====================
   DiagnosisResult.conditions パース
===================== */
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

/* =====================
   POST /api/diagnosis/result
===================== */
export async function POST(req: NextRequest) {
  try {
    const body: DiagnosisRequestBody = await req.json().catch(() => ({}));
    const schoolId = body.schoolId ?? "";
    const answers = body.answers ?? {};

    if (!schoolId) {
      return NextResponse.json(
        { message: "schoolId が指定されていません。" },
        { status: 400 }
      );
    }

    const missing = REQUIRED_QUESTION_IDS.filter((id) => !answers[id]);
    if (missing.length > 0) {
      return NextResponse.json(
        { message: `未回答の質問があります: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    /* =====================
       校舎（Q1）
    ===================== */
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
        { message: "選択した校舎が見つかりません。" },
        { status: 400 }
      );
    }

    /* =====================
       ジャンル（Q4）
    ===================== */
    const genreTag = getGenreTagFromAnswers(answers);
    const genreSlug = mapGenreTagToGenreSlug(genreTag);

    const genre =
      genreSlug === null
        ? null
        : await prisma.diagnosisGenre.findFirst({
            where: { schoolId, slug: genreSlug, isActive: true },
            select: { id: true, label: true, slug: true },
          });

    /* =====================
       おすすめコース（Q2）
    ===================== */
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

    /* =====================
       診断結果決定
    ===================== */
    const candidates = await prisma.diagnosisResult.findMany({
      where: { schoolId, isActive: true },
      orderBy: [{ priority: "desc" }, { sortOrder: "asc" }],
    });

    const ctx = {
      campusSlug: campus.slug,
      genreSlug: genre?.slug ?? null,
      q2ForCourse,
      recommendedCourseSlug: recommendedCourse?.slug ?? null,
    };

    let best =
      candidates.find((r) =>
        matchesConditions(parseConditions(r.conditions), ctx)
      ) ??
      candidates.find((r) => r.isFallback) ??
      candidates[0];

    if (!best) {
      return NextResponse.json(
        { message: "診断結果が登録されていません。" },
        { status: 400 }
      );
    }

    /* =====================
       ✅ 講師取得（今回の追加）
       校舎 × ジャンル × コース（存在する条件のみ）
    ===================== */
    const instructors = await prisma.diagnosisInstructor.findMany({
      where: {
        schoolId,
        isActive: true,
        campuses: { some: { campusId: campus.id } },
        ...(genre?.id ? { genres: { some: { genreId: genre.id } } } : {}),
        ...(recommendedCourse?.id
          ? { courses: { some: { courseId: recommendedCourse.id } } }
          : {}),
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        label: true,
        slug: true,
      },
    });

    const concernKey = getConcernKey(answers);
    const concernMessage = concernMessages[concernKey];

    /* =====================
       レスポンス
    ===================== */
    return NextResponse.json({
      pattern: "A",
      patternMessage: null,
      score: 100,
      headerLabel: "あなたにおすすめの診断結果です",

      bestMatch: {
        classId: best.id,
        className: recommendedCourse?.label ?? best.title,
        genres: genre ? [genre.label] : [],
        levels: [],
        targets: [],
      },

      // 旧teacherは互換のため残す
      teacher: {
        id: undefined,
        name: undefined,
        photoUrl: null,
        styles: [],
      },

      // ✅ 講師管理で紐づいた講師
      instructors: instructors.map((t) => ({
        id: t.id,
        label: t.label,
        slug: t.slug,
      })),

      breakdown: [],
      worstMatch: null,
      concernMessage,

      selectedCampus: {
        label: campus.label,
        slug: campus.slug,
        isOnline: campus.isOnline,
        address: campus.address ?? null,
        access: campus.access ?? null,
        googleMapUrl: campus.googleMapUrl ?? null,
      },
    });
  } catch (e: any) {
    console.error("[POST /api/diagnosis/result]", e);
    return NextResponse.json(
      { message: "サーバーエラーが発生しました。" },
      { status: 500 }
    );
  }
}
