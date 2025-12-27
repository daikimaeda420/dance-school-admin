// app/api/diagnosis/result/route.ts
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

// 文字列のズレ対策（前後空白だけは除去）
function norm(s: unknown): string {
  return String(s ?? "").trim();
}

/**
 * ✅ Q2の回答値を「コース管理で保存している形式」に揃える
 */
function getQ2ValueForCourse(answers: Record<string, string>): string {
  const raw = answers["Q2"]; // たぶん optionId
  const q2 = QUESTIONS.find((q) => q.id === "Q2");
  const opt: any = q2?.options?.find((o: any) => o.id === raw);
  return norm(opt?.label ?? opt?.value ?? opt?.tag ?? raw);
}

/**
 * ✅ DiagnosisResult.conditions を安全に読む
 * 想定例:
 *  - {"campus":["shibuya"],"genre":["kpop"],"q2Tags":["Q2_BEGINNER"],"courseSlug":["lv0"]}
 *  - {"isFallback":true} は DB列で持つのでここでは見ない
 */
type ResultConditions = {
  campus?: string[]; // campus slug
  genre?: string[]; // genre slug
  q2Tags?: string[]; // Q2のタグ/ラベル（あなたの運用に合わせる）
  courseSlug?: string[]; // DiagnosisCourse.slug を条件にしたい場合
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
  if (!list || list.length === 0) return true; // 条件未指定ならOK
  if (!value) return false;
  return list.includes(value);
}

/**
 * 条件マッチ判定
 * - 条件が書かれていない項目は "制約なし" として扱う
 * - 書かれている項目は一致必須
 */
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

  // Q2は "q2Tags" を使う（あなたの現状ロジックに合わせる）
  if (cond.q2Tags && cond.q2Tags.length > 0) {
    if (!cond.q2Tags.includes(ctx.q2ForCourse)) return false;
  }

  // コースslugで絞りたい場合（任意）
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

    // ✅ Q2に紐づく「おすすめコース」を取得（現状のまま）
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

    // ✅ links無し：conditions/priority/isFallback で結果を決定
    // まずは候補を全部取る（件数が多くなったら pagination/絞り込みに改善）
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

    // 1) 条件マッチを探す
    let best = candidates.find((r) =>
      matchesConditions(parseConditions(r.conditions), ctx)
    );

    // 2) 無ければ fallback
    if (!best) {
      best = candidates.find((r) => r.isFallback) ?? null;
    }

    if (!best) {
      // 「結果がない」事故を避けたいので、最後の保険：最優先の1件を返す
      // （これが嫌ならこの保険は消してOK）
      best = candidates[0] ?? null;
    }

    if (!best) {
      return NextResponse.json(
        {
          error: "NO_MATCHED_RESULT",
          message:
            "診断結果が1件も登録されていません（管理画面で診断結果を作成してください）。",
          debug: {
            campusSlug: campus.slug,
            genreSlug: genre?.slug ?? null,
            q2AnswerRaw: answers["Q2"],
            q2ForCourse,
            hasRecommendedCourse: Boolean(recommendedCourse),
          },
        },
        { status: 400 }
      );
    }

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

      // ✅ 追加：結果ページの一番下に表示する用
      selectedCampus: {
        label: campus.label,
        slug: campus.slug,
        isOnline: campus.isOnline,
        address: campus.address ?? null,
        access: campus.access ?? null,
        googleMapUrl: campus.googleMapUrl ?? null,
      },

      // ✅ デバッグ欲しければ（本番は消してOK）
      debug: {
        ctx,
        matchedBy: best.isFallback ? "fallback" : "conditions_or_priority",
        bestPriority: best.priority,
        bestConditions: best.conditions ?? null,
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
