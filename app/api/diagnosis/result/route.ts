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
  const q5 = QUESTIONS.find((q) => q.id === "Q5");
  const optionId = answers["Q5"];
  const opt = q5?.options.find((o) => o.id === optionId);
  const key = opt?.messageKey ?? "Msg_Consult";
  return key as ConcernMessageKey;
}

async function resolveOptionIdBySlug(args: {
  schoolId: string;
  model:
    | "DiagnosisCampus"
    | "DiagnosisCourse"
    | "DiagnosisGenre"
    | "DiagnosisInstructor";
  slug: string;
}) {
  const { schoolId, model, slug } = args;

  // Prismaのモデルアクセスを分岐（型安全寄り）
  if (model === "DiagnosisCampus") {
    return prisma.diagnosisCampus.findFirst({
      where: { schoolId, slug, isActive: true },
      select: { id: true, label: true, slug: true },
    });
  }
  if (model === "DiagnosisCourse") {
    return prisma.diagnosisCourse.findFirst({
      where: { schoolId, slug, isActive: true },
      select: { id: true, label: true, slug: true },
    });
  }
  if (model === "DiagnosisGenre") {
    return prisma.diagnosisGenre.findFirst({
      where: { schoolId, slug, isActive: true },
      select: { id: true, label: true, slug: true },
    });
  }
  return prisma.diagnosisInstructor.findFirst({
    where: { schoolId, slug, isActive: true },
    select: { id: true, label: true, slug: true },
  });
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

  // ここでの answers は「option.id=slug」を想定（あなたのAPIが slug を返している）
  const campusSlug = answers["Q1"];
  const courseSlug = answers["Q2"];
  const genreSlug = answers["Q3"];
  const instructorSlug = answers["Q4"];

  // slug → 実テーブルの id に解決（中間テーブルは id 同士で結ぶ想定）
  const [campus, course, genre, instructor] = await Promise.all([
    resolveOptionIdBySlug({
      schoolId,
      model: "DiagnosisCampus",
      slug: campusSlug,
    }),
    resolveOptionIdBySlug({
      schoolId,
      model: "DiagnosisCourse",
      slug: courseSlug,
    }),
    resolveOptionIdBySlug({
      schoolId,
      model: "DiagnosisGenre",
      slug: genreSlug,
    }),
    resolveOptionIdBySlug({
      schoolId,
      model: "DiagnosisInstructor",
      slug: instructorSlug,
    }),
  ]);

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
  if (!course) {
    return NextResponse.json(
      {
        error: "NO_COURSE",
        message:
          "選択したコース（レベル）が見つかりません（管理画面の登録/有効化を確認してください）。",
      },
      { status: 400 }
    );
  }
  if (!genre) {
    return NextResponse.json(
      {
        error: "NO_GENRE",
        message:
          "選択したジャンルが見つかりません（管理画面の登録/有効化を確認してください）。",
      },
      { status: 400 }
    );
  }
  if (!instructor) {
    return NextResponse.json(
      {
        error: "NO_INSTRUCTOR",
        message:
          "選択した講師が見つかりません（管理画面の登録/有効化を確認してください）。",
      },
      { status: 400 }
    );
  }

  // ✅ 診断結果：紐づきで 1件返す（sortOrder昇順で最上位）
  // 中間テーブルの A/B がどちら向きか分からなくても動くように OR を入れて両対応にしています
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

      and exists (
        select 1 from "_ResultCourses" x
        where (x."A" = r."id" and x."B" = ${course.id})
           or (x."B" = r."id" and x."A" = ${course.id})
      )

      and exists (
        select 1 from "_ResultGenres" x
        where (x."A" = r."id" and x."B" = ${genre.id})
           or (x."B" = r."id" and x."A" = ${genre.id})
      )

      and exists (
        select 1 from "_ResultInstructors" x
        where (x."A" = r."id" and x."B" = ${instructor.id})
           or (x."B" = r."id" and x."A" = ${instructor.id})
      )

    order by r."sortOrder" asc
    limit 1
  `;

  const best = rows[0];
  if (!best) {
    return NextResponse.json(
      {
        error: "NO_MATCHED_RESULT",
        message:
          "この回答パターンに紐づく診断結果が見つかりません。管理画面で「診断結果」と各項目（校舎/コース/ジャンル/講師）の紐づけを作成してください。",
      },
      { status: 400 }
    );
  }

  const concernKey = getConcernKey(answers);
  const concernMessage = concernMessages[concernKey];

  // 既存フロントの表示を壊さないため、レスポンス形は“近い形”で返す
  return NextResponse.json({
    pattern: "A",
    patternMessage: null,
    score: 100,
    headerLabel: "あなたにおすすめの診断結果です",
    bestMatch: {
      classId: best.id, // 互換のため classId に resultId を入れる
      className: best.title, // 互換のため className に title
      genres: [genre.label],
      levels: [course.label],
      targets: [],
    },
    teacher: {
      id: instructor.id,
      name: instructor.label,
      photoUrl: null,
      styles: [],
    },
    breakdown: [],
    worstMatch: null,
    concernMessage,

    // ✅ 新しい情報（必要ならフロントで使える）
    result: {
      id: best.id,
      title: best.title,
      body: best.body,
      ctaLabel: best.ctaLabel,
      ctaUrl: best.ctaUrl,
    },
  });
}
