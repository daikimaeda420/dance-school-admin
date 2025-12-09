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
  const remainingPages = Math.max(totalSteps - (stepIndex + 1), 0);

  const handleSelectOption = (qId: DiagnosisQuestionId, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: optionId,
    }));
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

  const handleSubmit = async () => {
    if (!schoolId) {
      setError("schoolId が指定されていません。（URLクエリ param: school）");
      return;
    }

    const missing: string[] = [];
    (["Q1", "Q2", "Q3", "Q4", "Q5"] as DiagnosisQuestionId[]).forEach((id) => {
      if (!answers[id]) missing.push(id);
    });
    if (missing.length > 0) {
      setError("未回答の質問があります。");
      return;
    }

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

  // ====== 診断結果画面 ======
  if (result) {
    return (
      <div className="w-full max-w-3xl rounded-3xl border border-gray-100 bg-white p-6 shadow-xl text-gray-900">
        {/* Progress */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex-1 mr-4">
            <div className="h-1.5 w-full rounded-full bg-gray-100">
              <div
                className="h-1.5 rounded-full bg-rose-500 transition-all"
                style={{ width: "100%" }}
              />
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:bg-gray-50"
              onClick={onClose}
            >
              ✕ 閉じる
            </button>
          )}
        </div>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-500">診断結果</p>
            <p className="mt-1 text-xl font-bold">
              あなたにおすすめのクラスはこちらです
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">マッチ度</div>
            <div className="text-3xl font-extrabold text-rose-500">
              {result.score}
              <span className="text-base text-gray-700"> / 100</span>
            </div>
            <div className="mt-1 inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-600">
              {result.headerLabel}
            </div>
          </div>
        </div>

        {/* Main recommendation */}
        <div className="mb-6 grid gap-4 md:grid-cols-[2fr,1.5fr]">
          <div className="rounded-2xl border border-gray-100 bg-rose-50/40 p-4">
            <p className="text-xs font-semibold text-gray-500">
              おすすめクラス
            </p>
            <p className="mt-2 text-lg font-bold">
              {result.bestMatch.className ?? "おすすめクラス"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              レベル:&nbsp;
              {result.bestMatch.levels.join(" / ") || "ー"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              対象:&nbsp;
              {result.bestMatch.targets.join(" / ") || "ー"}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <p className="text-xs font-semibold text-gray-500">担当講師</p>
            <div className="mt-3 flex items-center gap-3">
              {result.teacher.photoUrl && (
                <div className="h-14 w-14 overflow-hidden rounded-full bg-gray-200">
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
                  <div className="mt-1 text-[11px] text-gray-500">
                    スタイル：
                    {result.teacher.styles.join(" / ")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Matching breakdown */}
        <div className="mb-6 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
          <p className="mb-3 text-xs font-semibold text-gray-500">
            マッチング分析
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {result.breakdown.length === 0 && (
              <div className="rounded-xl bg-green-50 px-3 py-2 text-xs text-green-700">
                すべての項目でほぼ理想的なマッチングです。
              </div>
            )}
            {result.breakdown.map((b, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-3 rounded-xl bg-white px-3 py-2 text-[11px]"
              >
                <div className="font-semibold text-gray-700">
                  {b.key === "level" && "レベル"}
                  {b.key === "genre" && "ジャンル"}
                  {b.key === "age" && "年代"}
                  {b.key === "teacher" && "先生のスタイル"}
                </div>
                <div className="flex-1 text-right text-gray-600">{b.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Concern message */}
        <div className="mb-6 rounded-2xl bg-rose-50 p-4 text-xs text-rose-900">
          <p className="mb-1 font-semibold">こんな不安はありませんか？</p>
          <p>{result.concernMessage}</p>
        </div>

        {/* CTA */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <a
            href={
              result.bestMatch.classId
                ? `/reserve?classId=${encodeURIComponent(
                    result.bestMatch.classId
                  )}`
                : "/reserve"
            }
            className="inline-flex w-full items-center justify-center rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-rose-600 sm:w-auto"
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

  // ====== 質問ステップ画面 ======
  return (
    <div className="w-full max-w-3xl rounded-3xl border border-gray-100 bg-white p-6 shadow-xl text-gray-900">
      {/* 上部バー＋残りページ */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="h-1.5 w-full rounded-full bg-gray-100">
            <div
              className="h-1.5 rounded-full bg-rose-500 transition-all"
              style={{
                width: `${((stepIndex + 1) / totalSteps) * 100}%`,
              }}
            />
          </div>
          <p className="mt-2 text-[11px] text-gray-500">
            残り{remainingPages}ページ
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:bg-gray-50"
            onClick={onClose}
          >
            ✕ 閉じる
          </button>
        )}
      </div>

      {/* タイトル部分 */}
      <div className="mb-4 text-center">
        <p className="text-xs font-semibold text-rose-500">
          ダンススクール相性診断
        </p>
        <p className="mt-1 text-base font-bold">{currentQuestion.title}</p>
        {currentQuestion.description && (
          <p className="mt-1 text-xs text-gray-500">
            {currentQuestion.description}
          </p>
        )}
      </div>

      {/* 選択肢カード（画像サンプルっぽいレイアウト） */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {currentQuestion.options.map((opt, index) => {
          const selected = answers[currentQuestion.id] === opt.id;

          // ざっくり疑似アイコン（頭文字＋丸背景）
          const labelHead = opt.label.slice(0, 2);

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
              className={[
                "flex h-full flex-col items-stretch rounded-2xl border px-3 py-3 text-left text-xs shadow-sm transition",
                selected
                  ? "border-rose-500 bg-rose-50 text-rose-700 shadow-md"
                  : "border-gray-200 bg-white text-gray-800 hover:border-rose-300 hover:bg-rose-50/40",
              ].join(" ")}
            >
              <div className="mb-2 flex items-center gap-2">
                <div
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold",
                    selected
                      ? "bg-rose-500 text-white"
                      : "bg-rose-50 text-rose-500",
                  ].join(" ")}
                >
                  {labelHead}
                </div>
                <div className="text-[11px] font-semibold text-gray-600">
                  選択肢 {index + 1}
                </div>
              </div>
              <div className="flex-1 text-[12px] leading-snug">{opt.label}</div>
            </button>
          );
        })}
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="mb-2 rounded-md bg-red-50 px-3 py-2 text-[11px] text-red-600">
          {error}
        </div>
      )}

      {/* フッターボタン */}
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          className="rounded-full bg-gray-100 px-5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 disabled:opacity-40"
          onClick={handlePrev}
          disabled={stepIndex === 0 || isSubmitting}
        >
          戻る
        </button>
        {stepIndex < totalSteps - 1 ? (
          <button
            type="button"
            className="rounded-full bg-rose-500 px-6 py-2 text-xs font-semibold text-white shadow hover:bg-rose-600 disabled:opacity-40"
            onClick={handleNext}
            disabled={!canGoNext || isSubmitting}
          >
            次へ進む
          </button>
        ) : (
          <button
            type="button"
            className="rounded-full bg-rose-500 px-6 py-2 text-xs font-semibold text-white shadow hover:bg-rose-600 disabled:opacity-40"
            onClick={handleSubmit}
            disabled={!canGoNext || isSubmitting}
          >
            {isSubmitting ? "診断中..." : "診断結果を見る"}
          </button>
        )}
      </div>

      {/* デバッグ用 schoolId notice */}
      {!schoolId && (
        <div className="mt-2 text-[10px] text-red-400">
          ※ URLクエリ param「school」が指定されていません。 例:&nbsp;
          <code className="rounded bg-gray-100 px-1">?school=links</code>
        </div>
      )}
    </div>
  );
}
