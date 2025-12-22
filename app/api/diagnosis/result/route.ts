// app/api/diagnosis/result/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  QUESTIONS,
  concernMessages,
  ConcernMessageKey,
} from "@/lib/diagnosis/config";

// JSON から schoolId と answers を取り出す用の型
type DiagnosisRequestBody = {
  schoolId?: string;
  answers?: Record<string, string>;
};

// クライアント側がQ1〜Q6を必須にしているので合わせる
const REQUIRED_QUESTION_IDS = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"] as const;

function getConcernKey(answers: Record<string, string>): ConcernMessageKey {
  const q6 = QUESTIONS.find((q) => q.id === "Q6");
  const optionId = answers["Q6"];
  const opt = q6?.options.find((o) => o.id === optionId);
  const key = opt?.messageKey ?? "Msg_Consult";
  return key as ConcernMessageKey;
}

// Q4(option.id) -> tag(Genre_KPOP etc) を取得
function getGenreTagFromAnswers(answers: Record<string, string>): string {
  const q4 = QUESTIONS.find((q) => q.id === "Q4");
  const optionId = answers["Q4"];
  const opt = q4?.options.find((o) => o.id === optionId);
  // 迷っている場合は "Genre_All"
  return opt?.tag ?? "Genre_All";
}

// 仕様書対応：固定Genreタグ -> 管理画面ジャンル(slug)へマッピング
function mapGenreTagToGenreSlug(tag: string): string | null {
  // 管理画面の DiagnosisGenre.slug をこの値に合わせておく運用でもOK
  // 例: kpop / hiphop / jazz / themepark
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
      return null; // 絞らない
    default:
      return null;
  }
}

type ResultRow = {
  id: string;
  schoolId: string;
  title: string;
  body: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function POST(req: NextRequest) {
  let body: DiagnosisRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "JSONの形式が不正です。" },
      { status: 400 }
    );
  }

  const schoolId = body.schoolId ?? "";
  const answers = body.answers ?? {};

  if (!schoolId) {
    return NextResponse.json(
      { error: "NO_SCHOOL_ID", message: "schoolId が指定されていません。" },
      { status: 400 }
    );
  }

  // 必須質問が全部埋まっているかチェック
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

  // -------------------------
  // ✅ Q1: 校舎（管理画面の DiagnosisCampus.slug で解決）
  // -------------------------
  const campusSlug = answers["Q1"];
  const campus = await prisma.diagnosisCampus.findFirst({
    where: { schoolId, slug: campusSlug, isActive: true },
    select: { id: true, label: true, slug: true },
  });

  if (!campus) {
    return NextResponse.json(
      {
        error: "NO_CAMPUS",
        message:
          "選択した校舎が見つかりません（管理画面の登録/有効化を確認してください）。",
      },
      { status: 400 }
    );
  }

  // -------------------------
  // ✅ Q4: 好み（固定 option.id -> tag -> DiagnosisGenre.slug に変換して解決）
  // -------------------------
  const genreTag = getGenreTagFromAnswers(answers);
  const genreSlug = mapGenreTagToGenreSlug(genreTag);

  // Genre_All は絞り込みしない（= null）
  const genre =
    genreSlug === null
      ? null
      : await prisma.diagnosisGenre.findFirst({
          where: { schoolId, slug: genreSlug, isActive: true },
          select: { id: true, label: true, slug: true },
        });

  // Genre_All以外で見つからないのはエラー
  if (genreSlug !== null && !genre) {
    return NextResponse.json(
      {
        error: "NO_GENRE",
        message:
          "選択したジャンルが見つかりません（管理画面の登録/有効化を確認してください）。",
      },
      { status: 400 }
    );
  }

  // -------------------------
  // ✅ 診断結果：校舎 + (ジャンル任意) で 1件返す
  // -------------------------
  const rows = await prisma.$queryRaw<ResultRow[]>`
    select r.*
    from "DiagnosisResult" r
    where r."schoolId" = ${schoolId}
      and r."isActive" = true

      and exists (
        select 1 from "_ResultCampuses" x
        where (x."A" = r."id" and x."B" = ${campus.id})
           or (x."B" = r."id" and x."A" = ${campus.id})
      )

      ${
        genre
          ? prisma.$queryRaw`
            and exists (
              select 1 from "_ResultGenres" x
              where (x."A" = r."id" and x."B" = ${genre.id})
                 or (x."B" = r."id" and x."A" = ${genre.id})
            )
          `
          : prisma.$queryRaw``
      }

    order by r."sortOrder" asc
    limit 1
  `;

  const best = rows[0];
  if (!best) {
    return NextResponse.json(
      {
        error: "NO_MATCHED_RESULT",
        message:
          "この回答パターンに紐づく診断結果が見つかりません。管理画面で「診断結果」と各項目（校舎/ジャンル）の紐づけを作成してください。",
      },
      { status: 400 }
    );
  }

  // -------------------------
  // ✅ 不安メッセージ（Q6）
  // -------------------------
  const concernKey = getConcernKey(answers);
  const concernMessage = concernMessages[concernKey];

  return NextResponse.json({
    pattern: "A",
    patternMessage: null,
    score: 100,
    headerLabel: "あなたにおすすめの診断結果です",
    bestMatch: {
      classId: best.id, // 互換のため classId に resultId
      className: best.title,
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
  });
}
