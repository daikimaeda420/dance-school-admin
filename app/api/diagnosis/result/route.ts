// app/api/diagnosis/result/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  QUESTIONS,
  concernMessages,
  ConcernMessageKey,
} from "@/lib/diagnosis/config";
import {
  MatchContext,
  selectMatches,
  ClassLike,
  TeacherLike,
  PairLike,
} from "@/lib/diagnosis/score";

// JSON から schoolId と answers を取り出す用の型
type DiagnosisRequestBody = {
  schoolId?: string;
  answers?: Record<string, string>;
};

// Q1〜Q5 のID
const REQUIRED_QUESTION_IDS = ["Q1", "Q2", "Q3", "Q4", "Q5"] as const;

// ユーザー回答から、判定用タグ & 不安メッセージキーを取り出す
function extractContextAndConcern(answers: Record<string, string>): {
  ctx: MatchContext;
  concernKey: ConcernMessageKey;
} {
  const qMap = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

  const getTag = (qid: string): string => {
    const q = qMap[qid];
    if (!q) return "";
    const optionId = answers[qid];
    const opt = q.options.find((o) => o.id === optionId);
    return opt?.tag ?? "";
  };

  const getConcernKey = (): ConcernMessageKey => {
    const q = qMap["Q5"];
    const optionId = answers["Q5"];
    const opt = q?.options.find((o) => o.id === optionId);
    const key = opt?.messageKey ?? "Msg_Consult";
    return key as ConcernMessageKey;
  };

  const ctx: MatchContext = {
    userLevel: getTag("Q1"),
    userAge: getTag("Q2"),
    userGenre: getTag("Q3"),
    userTeacherStyle: getTag("Q4"),
  };

  const concernKey = getConcernKey();
  return { ctx, concernKey };
}

// Prisma から取ってきたクラス&講師を、スコア計算用のシンプルな形に変換
function toPairsFromPrisma(classes: any[]): PairLike<ClassLike, TeacherLike>[] {
  const pairs: PairLike<ClassLike, TeacherLike>[] = [];

  for (const clazz of classes) {
    const baseClass: ClassLike = {
      id: clazz.id,
      name: clazz.name,
      levels: clazz.levels ?? [],
      targets: clazz.targets ?? [],
      genres: clazz.genres ?? [],
    };

    // clazz.teachers は、中間テーブル（TeacherClass）的な想定
    for (const tc of clazz.teachers ?? []) {
      if (!tc.teacher) continue;
      const t = tc.teacher;
      const teacher: TeacherLike = {
        id: t.id,
        name: t.name,
        photoUrl: t.photoUrl,
        styles: t.styles ?? [],
      };
      pairs.push({ clazz: baseClass, teacher });
    }
  }

  return pairs;
}

export async function POST(req: NextRequest) {
  let body: DiagnosisRequestBody;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "JSONの形式が不正です。" },
      { status: 400 }
    );
  }

  const schoolId = body.schoolId;
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

  // 回答から判定コンテキスト & 不安メッセージキーを抽出
  const { ctx, concernKey } = extractContextAndConcern(answers);

  // schoolId に紐づくクラス & 講師を取得
  // ※ ここは Prisma のモデル名・リレーション名に合わせて調整してください
  const classes = await prisma.schoolClass.findMany({
    where: {
      schoolId,
      isActive: true,
    },
    include: {
      teachers: {
        include: {
          teacher: true,
        },
      },
    },
  });

  if (!classes.length) {
    return NextResponse.json(
      {
        error: "NO_CLASS",
        message: "診断対象のクラスが登録されていません。",
      },
      { status: 400 }
    );
  }

  // Prismaの結果をスコア計算用の形に変換
  const pairs = toPairsFromPrisma(classes);

  if (!pairs.length) {
    return NextResponse.json(
      {
        error: "NO_PAIR",
        message: "クラスと講師の組み合わせが存在しません。",
      },
      { status: 400 }
    );
  }

  // スコアリング & ベスト/ワースト選定
  const { pattern, best, worst, scored } = selectMatches(pairs, ctx);

  const score = best.score;

  // ヘッダーのキャッチコピー
  let headerLabel = "";
  if (score >= 95) {
    headerLabel = "運命のクラスかも！？相性バッチリ！";
  } else if (score >= 80) {
    headerLabel = "かなりおすすめ！楽しく続けられそう";
  } else {
    headerLabel = "概ねマッチ！まずは体験で確認を";
  }

  // パターンB用の追加ラベル（要相談/特別プラン）
  const patternMessage =
    pattern === "A"
      ? null
      : "診断結果：要相談/特別プラン（体験時にスタッフがじっくりご相談に乗ります）";

  const concernMessage = concernMessages[concernKey];

  return NextResponse.json({
    pattern, // "A" or "B"
    patternMessage,
    score,
    headerLabel, // ①ヘッダーエリアの文言
    bestMatch: {
      // ②メイン提案エリア
      classId: best.clazz.id,
      className: best.clazz.name,
      genres: best.clazz.genres,
      levels: best.clazz.levels,
      targets: best.clazz.targets,
    },
    teacher: {
      id: best.teacher.id,
      name: best.teacher.name,
      photoUrl: best.teacher.photoUrl,
      styles: best.teacher.styles,
    },
    breakdown: best.breakdown, // ③マッチング分析チャート用の内訳
    worstMatch:
      pattern === "A"
        ? {
            className: worst.clazz.name,
            teacherName: worst.teacher.name,
            score: worst.score,
          }
        : null, // ④ワーストマッチ（オプション）
    concernMessage, // ⑤CVR特化メッセージ（Q5に紐づく不安解消メッセージ）
    // デバッグ用に全候補のスコア一覧を返しておく（必要なければ削ってOK）
    allScores: scored.map((s) => ({
      className: s.clazz.name,
      teacherName: s.teacher.name,
      score: s.score,
    })),
  });
}
