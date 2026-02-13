// lib/diagnosis/score.ts
import { LEVEL_ORDER } from "./config";

// ユーザーの回答から作る「判定コンテキスト」
export type MatchContext = {
  userLevel: string; // 例: "Lv1_入門"
  userAge: string; // 例: "Age_Adult_Work"
  userTeacherStyle: string; // 例: "Style_Healing"
};

export type ScoreBreakdownKey = "level" | "age" | "teacher";

export type ScoreBreakdownItem = {
  key: ScoreBreakdownKey;
  scoreDiff: number; // どれだけスコアを減らしたか（マイナス値）
  note: string; // フロントでそのまま表示できるコメント
};

// クラス側に必要な項目
export type ClassLike = {
  id?: string;
  name?: string;
  levels: string[]; // ["Lv0_超入門", ...]
  targets: string[]; // ["Age_Adult_Work", ...]
};

// 講師側に必要な項目
export type TeacherLike = {
  id?: string;
  name?: string;
  photoUrl?: string | null;
  styles: string[]; // ["Style_Healing", ...]
};

export type PairLike<TClass = ClassLike, TTeacher = TeacherLike> = {
  clazz: TClass;
  teacher: TTeacher;
};

export type ScoredPair<TClass = ClassLike, TTeacher = TeacherLike> = PairLike<
  TClass,
  TTeacher
> & {
  score: number;
  breakdown: ScoreBreakdownItem[];
};

/**
 * レベルの「段階差」を計算
 * 0段階差: 完全一致
 * 1段階差: 許容範囲
 * 2以上: 乖離が大きい（減点30 & 受講非推奨候補）
 */
export function levelDistance(
  userLevel: string,
  classLevels: string[]
): number {
  const idxUser = LEVEL_ORDER.indexOf(
    userLevel as (typeof LEVEL_ORDER)[number]
  );
  if (idxUser === -1 || classLevels.length === 0) return 2; // 不明な場合は最悪扱い

  const distances = classLevels
    .map((lv) => LEVEL_ORDER.indexOf(lv as (typeof LEVEL_ORDER)[number]))
    .filter((i) => i >= 0)
    .map((i) => Math.abs(i - idxUser));

  if (distances.length === 0) return 2;
  return Math.min(...distances);
}

/**
 * 1クラス×1講師のスコアを計算
 * 減点方式:
 *  - レベル  : 0 / -10 / -30
 *  - 年代    : 0 / -15
 *  - スタイル: 0 / -5
 */
export function scorePair<
  TClass extends ClassLike,
  TTeacher extends TeacherLike
>(
  pair: PairLike<TClass, TTeacher>,
  ctx: MatchContext
): ScoredPair<TClass, TTeacher> {
  let score = 100;
  const breakdown: ScoreBreakdownItem[] = [];

  // 1. レベル
  const dist = levelDistance(ctx.userLevel, pair.clazz.levels || []);
  if (dist === 0) {
    // 減点なし
  } else if (dist === 1) {
    score -= 10;
    breakdown.push({
      key: "level",
      scoreDiff: -10,
      note: "レベルが少し高め/低めですが、ついていける範囲です。",
    });
  } else {
    score -= 30;
    breakdown.push({
      key: "level",
      scoreDiff: -30,
      note: "レベル差が大きく、受講難易度が高そうです。",
    });
  }

  // 2. 年代
  if (!(pair.clazz.targets || []).includes(ctx.userAge)) {
    score -= 15;
    breakdown.push({
      key: "age",
      scoreDiff: -15,
      note: "対象年代と少しずれています。",
    });
  }

  // 3. 先生のスタイル
  if (!(pair.teacher.styles || []).includes(ctx.userTeacherStyle)) {
    score -= 5;
    breakdown.push({
      key: "teacher",
      scoreDiff: -5,
      note: "先生の指導スタイルがご希望とは少し違います。",
    });
  }

  return {
    ...pair,
    score,
    breakdown,
  };
}

/**
 * 全クラス×講師ペアの中から
 * - ベストマッチ
 * - ワーストマッチ
 * を選出し、パターンA/Bを判定する
 *
 * パターンA: ベストスコア >= 80
 * パターンB: ベストスコア <= 79
 */
export function selectMatches<
  TClass extends ClassLike,
  TTeacher extends TeacherLike
>(
  pairs: PairLike<TClass, TTeacher>[],
  ctx: MatchContext
): {
  pattern: "A" | "B";
  best: ScoredPair<TClass, TTeacher>;
  worst: ScoredPair<TClass, TTeacher>;
  scored: ScoredPair<TClass, TTeacher>[];
} {
  const scored = pairs.map((p) => scorePair(p, ctx));

  if (scored.length === 0) {
    throw new Error("No pairs to score.");
  }

  // レベル差2以上 & -30点ついたものは「ベスト候補」から除外してもOK
  const validBest = scored.filter(
    (s) => !s.breakdown.some((b) => b.key === "level" && b.scoreDiff <= -30)
  );

  const sortedForBest = (validBest.length ? validBest : scored)
    .slice()
    .sort((a, b) => b.score - a.score);
  const sortedForWorst = scored.slice().sort((a, b) => a.score - b.score);

  const best = sortedForBest[0];
  const worst = sortedForWorst[0];

  const pattern: "A" | "B" = best.score >= 80 ? "A" : "B";

  return {
    pattern,
    best,
    worst,
    scored,
  };
}
