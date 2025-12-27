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
      // ✅ 住所/アクセス/GoogleMap を追加で返す
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

    // ✅ A案：Q2に紐づく「おすすめコース」を取得
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

    // ✅ 診断結果を1件取得
    const best = await prisma.diagnosisResult.findFirst({
      where: {
        schoolId,
        isActive: true,
        campuses: { some: { id: campus.id } },
        ...(genre ? { genres: { some: { id: genre.id } } } : {}),
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        title: true,
        body: true,
        ctaLabel: true,
        ctaUrl: true,
      },
    });

    if (!best) {
      return NextResponse.json(
        {
          error: "NO_MATCHED_RESULT",
          message:
            "この回答パターンに紐づく診断結果が見つかりません。管理画面で「診断結果」と各項目（校舎/ジャンル）の紐づけを作成してください。",
          debug: {
            campusId: campus.id,
            genreId: genre?.id ?? null,
            genreSlug,
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
    });
  } catch (e: any) {
    console.error("[POST /api/diagnosis/result] error", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: e?.message ?? "サーバーエラー" },
      { status: 500 }
    );
  }
}
