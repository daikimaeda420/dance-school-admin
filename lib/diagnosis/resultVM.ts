// lib/diagnosis/resultVM.ts
import { QUESTIONS, concernMessages, DiagnosisQuestionId } from "./config";
import {
  selectMatches,
  MatchContext,
  PairLike,
  ScoredPair,
  ClassLike,
  TeacherLike,
} from "./score";
import {
  LEVEL_RESULT_COPY,
  AGE_RESULT_COPY,
  TEACHER_RESULT_COPY,
  CONCERN_RESULT_COPY,
} from "./resultCopy";

type AnswersByQuestion = Partial<Record<DiagnosisQuestionId, string>>;
// 例：{ Q1:"shibuya", Q2:"2-2", Q3:"3-5", ... }（option.id を入れる想定）

export type DiagnosisResultVM<
  TClass extends ClassLike = ClassLike,
  TTeacher extends TeacherLike = TeacherLike
> = {
  pattern: "A" | "B";
  best: ScoredPair<TClass, TTeacher>;
  worst: ScoredPair<TClass, TTeacher>;
  scored: ScoredPair<TClass, TTeacher>[];

  // 画面に出す “固定コピー” 群
  userMessages: {
    level?: { selectedLabel: string; message: string };
    age?: { selectedLabel: string; message: string };
    teacher?: { selectedLabel: string; message: string };
    concern?: {
      selectedLabel: string;
      message: string;
      consultMessage?: string;
    };
  };

  // 結果ヘッダ用
  headline: string;
  subline: string;
  campusOptionId?: string; // Q1で選んだ option.id
};

function getOption(qid: DiagnosisQuestionId, optionId: string | undefined) {
  if (!optionId) return null;
  const q = QUESTIONS.find((x) => x.id === qid);
  if (!q) return null;
  return q.options.find((o) => o.id === optionId) ?? null;
}

export function buildMatchContextFromAnswers(
  answers: AnswersByQuestion
): MatchContext {
  const optQ2 = getOption("Q2", answers.Q2);
  const optQ3 = getOption("Q3", answers.Q3);
  const optQ4 = getOption("Q4", answers.Q4);
  const optQ5 = getOption("Q5", answers.Q5);

  return {
    userLevel: optQ2?.tag ?? "Lv1_入門",
    userAge: optQ3?.tag ?? "Age_Adult_Work",
    userGenre: optQ4?.tag ?? "Genre_All",
    userTeacherStyle: optQ5?.tag ?? "Style_Healing",
  };
}

export function buildDiagnosisResultVM<
  TClass extends ClassLike,
  TTeacher extends TeacherLike
>(
  answers: AnswersByQuestion,
  pairs: PairLike<TClass, TTeacher>[]
): DiagnosisResultVM<TClass, TTeacher> {
  const ctx = buildMatchContextFromAnswers(answers);

  // ✅ selectMatches が要求する型 (PairLike<ClassLike, TeacherLike>[]) と一致する
  const { pattern, best, worst, scored } = selectMatches(pairs, ctx);

  const optQ2 = getOption("Q2", answers.Q2);
  const optQ3 = getOption("Q3", answers.Q3);
  const optQ5 = getOption("Q5", answers.Q5);
  const optQ6 = getOption("Q6", answers.Q6);

  const levelTag = optQ2?.tag;
  const ageTag = optQ3?.tag;
  const teacherTag = optQ5?.tag;
  const concernKey = optQ6?.messageKey;

  const headline = `あなたにおすすめ：${
    best.clazz?.name ?? "おすすめクラス"
  } × ${best.teacher?.name ?? "おすすめ講師"}`;

  return {
    pattern,
    best,
    worst,
    scored,
    campusOptionId: answers.Q1,
    headline,
    subline: "予約は1分で完了。しつこい営業はありません。",
    userMessages: {
      level: optQ2
        ? {
            selectedLabel: optQ2.label,
            message:
              LEVEL_RESULT_COPY[levelTag ?? ""] ??
              "あなたのペースに合わせて進められます。",
          }
        : undefined,
      age: optQ3
        ? {
            selectedLabel: optQ3.label,
            message:
              AGE_RESULT_COPY[ageTag ?? ""] ??
              "生活スタイルに合わせて通えます。",
          }
        : undefined,
      teacher: optQ5
        ? {
            selectedLabel: optQ5.label,
            message:
              TEACHER_RESULT_COPY[teacherTag ?? ""] ??
              "あなたに合う先生と出会えます。",
          }
        : undefined,
      concern: optQ6
        ? {
            selectedLabel: optQ6.label,
            message: concernKey
              ? CONCERN_RESULT_COPY[concernKey]
              : "不安を一緒に解消できます。",
            // ※既存 concernMessages は “相談導線/運営説明” として使いたい場合だけ
            consultMessage: concernKey
              ? concernMessages[concernKey]
              : undefined,
          }
        : undefined,
    },
  };
}
