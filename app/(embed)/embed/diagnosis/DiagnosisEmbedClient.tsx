// app/(embed)/embed/diagnosis/DiagnosisEmbedClient.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { QUESTIONS, DiagnosisQuestionId } from "@/lib/diagnosis/config";

type AnswersState = Partial<Record<DiagnosisQuestionId, string>>;

type DiagnosisResult = {
  pattern: "A" | "B";
  patternMessage: string | null;
  score: number;
  headerLabel: string;
  bestMatch: {
    classId?: string;
    className?: string;
    genres: string[];
    levels: string[];
    targets: string[];
  };
  teacher: {
    id?: string;
    name?: string;
    photoUrl?: string | null;
    styles: string[];
  };
  breakdown: {
    key: "level" | "genre" | "age" | "teacher";
    scoreDiff: number;
    note: string;
  }[];
  worstMatch: {
    className?: string;
    teacherName?: string;
    score: number;
  } | null;
  concernMessage: string;
  allScores: {
    className?: string;
    teacherName?: string;
    score: number;
  }[];
};

type Props = {
  schoolIdProp?: string;
  onClose?: () => void;
};

export default function DiagnosisEmbedClient({ schoolIdProp, onClose }: Props) {
  const searchParams = useSearchParams();

  const [answers, setAnswers] = useState<AnswersState>({});
  const [stepIndex, setStepIndex] = useState(0); // 0〜4 (Q1〜Q5)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const schoolId = useMemo(() => {
    if (schoolIdProp) return schoolIdProp;
    return searchParams.get("school") ?? "";
  }, [schoolIdProp, searchParams]);

  const questions = QUESTIONS;
  const currentQuestion = questions[stepIndex];
  const totalSteps = questions.length;

  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;

  const canGoNext = !!currentAnswer || !!result;

  // -----------------------
  // 診断実行
  // -----------------------
  const handleSubmit = async () => {
    if (!schoolId) {
      setError("schoolId が指定されていません。（URLクエリ param: school）");
      return;
    }

    // Q1〜Q5 が埋まっているかチェック
    const missing: string[] = [];
    (["Q1", "Q2", "Q3", "Q4", "Q5"] as DiagnosisQuestionId[]).forEach((id) => {
      if (!answers[id]) missing.push(id);
    });
    if (missing.length > 0) {
      setError("未回答の質問があります。");
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/diagnosis/result", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schoolId,
          answers,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? "診断結果の取得中にエラーが発生しました。");
        return;
      }

      const data = (await res.json()) as DiagnosisResult;
      setResult(data);
    } catch (e) {
      console.error(e);
      setError("通信エラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  // -----------------------
  // 質問を選択したとき（自動で次へ / 最後なら自動診断）
  // -----------------------
  const handleSelectOption = (qId: DiagnosisQuestionId, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: optionId,
    }));

    // 今表示している質問の選択時だけ自動遷移
    if (qId === currentQuestion.id) {
      const isLastStep = stepIndex === totalSteps - 1;

      if (isLastStep) {
        // 最終質問 → 自動で診断実行
        setTimeout(() => {
          void handleSubmit();
        }, 150);
      } else {
        // それ以外 → 次の質問へ
        setTimeout(() => {
          setStepIndex((prev) => prev + 1);
          setError(null);
        }, 150);
      }
    }
  };

  const handleNext = () => {
    if (stepIndex < totalSteps - 1) {
      setStepIndex((prev) => prev + 1);
      setError(null);
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
      setError(null);
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setStepIndex(0);
    setResult(null);
    setError(null);
  };

  // ==========================
  // 診断結果画面
  // ==========================
  if (result) {
    return (
      <div className="w-full max-w-4xl rounded-3xl border bg-white p-8 shadow-xl text-gray-900">
        {/* ヘッダー */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-500">マッチ度</div>
            <div className="text-3xl font-extrabold">
              {result.score}
              <span className="text-lg font-semibold"> / 100</span>
            </div>
            <div className="mt-1 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {result.headerLabel}
            </div>
            {result.patternMessage && (
              <div className="mt-1 text-xs text-gray-500">
                {result.patternMessage}
              </div>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:bg-gray-100"
              onClick={onClose}
            >
              ✕
            </button>
          )}
        </div>

        {/* メイン提案エリア */}
        <div className="mb-4 rounded-2xl bg-gray-50 p-4">
          <div className="text-xs font-semibold text-gray-500">
            あなたにおすすめのクラス
          </div>
          <div className="mt-1 text-lg font-bold">
            {result.bestMatch.className ?? "おすすめクラス"}
          </div>
          <div className="mt-2 flex items-center gap-3">
            {result.teacher.photoUrl && (
              <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.teacher.photoUrl}
                  alt={result.teacher.name ?? "講師"}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div>
              <div className="text-sm font-semibold">
                {result.teacher.name ?? "担当講師"}
              </div>
              {result.teacher.styles?.length > 0 && (
                <div className="mt-1 text-xs text-gray-500">
                  スタイル：
                  {result.teacher.styles.join(" / ")}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* マッチング分析エリア */}
        <div className="mb-4">
          <div className="mb-2 text-xs font-semibold text-gray-500">
            マッチング分析
          </div>
          <div className="space-y-1 text-xs">
            {result.breakdown.length === 0 && (
              <div className="rounded-md bg-green-50 px-2 py-1 text-green-700">
                すべての項目でほぼ理想的なマッチングです。
              </div>
            )}
            {result.breakdown.map((b, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-2 rounded-md bg-gray-50 px-2 py-1"
              >
                <div className="font-semibold">
                  {b.key === "level" && "レベル"}
                  {b.key === "genre" && "ジャンル"}
                  {b.key === "age" && "年代"}
                  {b.key === "teacher" && "先生のスタイル"}
                </div>
                <div className="flex-1 text-right text-[11px] text-gray-600">
                  {b.note}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 不安解消メッセージ */}
        <div className="mb-4 rounded-xl bg-blue-50 p-3 text-xs text-blue-900">
          <div className="mb-1 font-semibold">こんな不安はありませんか？</div>
          <div>{result.concernMessage}</div>
        </div>

        {/* CTAエリア */}
        <div className="mt-2 flex flex-col gap-2">
          <a
            href={
              result.bestMatch.classId
                ? `/reserve?classId=${encodeURIComponent(
                    result.bestMatch.classId
                  )}`
                : "/reserve"
            }
            className="flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            このクラスの体験レッスンを予約する
          </a>
          <button
            type="button"
            className="text-xs text-gray-500 underline"
            onClick={handleRestart}
          >
            診断をやり直す
          </button>
        </div>
      </div>
    );
  }

  // ==========================
  // 質問ステップ画面
  // ==========================
  return (
    <div className="w-full max-w-4xl rounded-3xl border bg-white p-8 shadow-xl text-gray-900">
      {/* 上部ヘッダー */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold text-blue-600">
            ダンススクール相性診断
          </div>
          <div className="text-sm font-bold">
            あなたに「運命のクラス」が見つかる！
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:bg-gray-100"
            onClick={onClose}
          >
            ✕
          </button>
        )}
      </div>

      {/* ステップインジケータ（1個1個に余白あり） */}
      <div className="mb-8 flex flex-col items-center">
        <div className="flex gap-3">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className={[
                "h-2 w-10 rounded-full transition-all",
                idx === stepIndex
                  ? "bg-blue-600"
                  : idx < stepIndex
                  ? "bg-blue-200"
                  : "bg-gray-200",
              ].join(" ")}
            />
          ))}
        </div>
        <div className="mt-3 text-center text-[11px] text-gray-500">
          質問 {stepIndex + 1} / {totalSteps}
        </div>
      </div>

      {/* 質問タイトル */}
      <div className="mb-4 text-center">
        <div className="text-sm font-semibold">{currentQuestion.title}</div>
        {currentQuestion.description && (
          <div className="mt-1 text-xs text-gray-500">
            {currentQuestion.description}
          </div>
        )}
      </div>

      {/* 質問項目：PCで2カラム */}
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        {currentQuestion.options.map((opt) => {
          const selected = answers[currentQuestion.id] === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
              className={[
                "flex h-full items-start gap-3 rounded-2xl border px-3 py-3 text-left text-xs transition",
                selected
                  ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-gray-200 bg-white text-gray-800 hover:border-blue-300 hover:bg-blue-50/40",
              ].join(" ")}
            >
              {/* 仮アイコン枠（あとで画像に差し替え） */}
              <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-[10px] text-gray-400">
                IMG
              </div>
              <div className="flex-1 leading-snug">{opt.label}</div>
            </button>
          );
        })}
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="mb-2 rounded-md bg-red-50 px-2 py-1 text-[11px] text-red-600">
          {error}
        </div>
      )}

      {/* フッター操作（手動で進みたい人向けに残しておく） */}
      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          className="text-xs text-gray-500 underline disabled:opacity-40"
          onClick={handlePrev}
          disabled={stepIndex === 0 || isSubmitting}
        >
          戻る
        </button>
        {stepIndex < totalSteps - 1 ? (
          <button
            type="button"
            className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            onClick={handleNext}
            disabled={!canGoNext || isSubmitting}
          >
            次へ進む
          </button>
        ) : (
          <button
            type="button"
            className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            onClick={handleSubmit}
            disabled={!canGoNext || isSubmitting}
          >
            {isSubmitting ? "診断中..." : "診断結果を見る"}
          </button>
        )}
      </div>

      {/* schoolIdが無い場合の注意（デバッグ用） */}
      {!schoolId && (
        <div className="mt-2 text-[10px] text-red-400">
          ※ URLクエリ param「school」が指定されていません。
          <br />
          例: <code className="rounded bg-gray-100 px-1">?school=links</code>
        </div>
      )}
    </div>
  );
}
