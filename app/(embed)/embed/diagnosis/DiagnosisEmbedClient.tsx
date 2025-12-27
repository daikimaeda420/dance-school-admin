// app/(embed)/embed/diagnosis/DiagnosisEmbedClient.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  QUESTIONS,
  DiagnosisQuestionId,
  DiagnosisQuestionOption,
} from "@/lib/diagnosis/config";

type AnswersState = Partial<Record<DiagnosisQuestionId, string>>;

// ✅ 追加：講師（診断機能の DiagnosisInstructor を表示する用）
type DiagnosisInstructorVM = {
  id: string;
  label: string;
  slug: string;
  // API 側で URL を返す設計にするなら使える（現状は未使用でもOK）
  photoUrl?: string | null;
};

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

  // 既存（運用モデル側のteacher）：残しつつ fallback に使う
  teacher: {
    id?: string;
    name?: string;
    photoUrl?: string | null;
    styles: string[];
  };

  // ✅ 追加：講師管理（DiagnosisInstructor）で紐づけた講師一覧
  // /api/diagnosis/result のレスポンスに instructors を載せれば、ここで表示される
  instructors?: DiagnosisInstructorVM[];

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
  campus?: {
    id?: string;
    label: string;
    slug: string;
    isOnline?: boolean;
    address?: string | null;
    access?: string | null;
    googleMapUrl?: string | null;
  };
  selectedCampus?: {
    label: string;
    slug: string;
    isOnline?: boolean;
    address?: string | null;
    access?: string | null;
    googleMapUrl?: string | null;
  };
};

type Props = {
  schoolIdProp?: string;
  onClose?: () => void;

  // 管理画面/APIから渡される「選択肢一覧」
  campusOptions?: DiagnosisQuestionOption[];
  courseOptions?: DiagnosisQuestionOption[];
  genreOptions?: DiagnosisQuestionOption[];
  instructorOptions?: DiagnosisQuestionOption[];
};

export default function DiagnosisEmbedClient({
  schoolIdProp,
  onClose,
  campusOptions,
  courseOptions,
  genreOptions,
  instructorOptions,
}: Props) {
  const searchParams = useSearchParams();

  const [answers, setAnswers] = useState<AnswersState>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ schoolId / school どっちでも受ける（ここ重要）
  const schoolId = useMemo(() => {
    if (schoolIdProp) return schoolIdProp;
    return searchParams.get("schoolId") ?? searchParams.get("school") ?? "";
  }, [schoolIdProp, searchParams]);

  // ✅ 仕様書通りの差し替え方針
  // - Q1 校舎：管理画面連動（campusOptions）
  // - Q2〜Q6：固定（config.ts）
  //   ※ courseOptions / genreOptions / instructorOptions は使わない
  const questions = useMemo(() => {
    const hasCampus = (campusOptions?.length ?? 0) > 0;
    if (!hasCampus) return QUESTIONS;

    return QUESTIONS.map((q) => {
      if (q.id === "Q1" && campusOptions && campusOptions.length > 0) {
        return { ...q, options: campusOptions };
      }
      return q; // ✅ Q2〜Q6 は固定のまま
    });
  }, [campusOptions]);

  const currentQuestion = questions[stepIndex];
  const totalSteps = questions.length;

  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;

  const canGoNext = !!currentAnswer || !!result;

  // -----------------------
  // 診断実行（answersを引数で受け取れるように）
  // -----------------------
  const handleSubmit = async (answersOverride?: AnswersState) => {
    const finalAnswers = answersOverride ?? answers;

    if (!schoolId) {
      setError(
        "schoolId が指定されていません。（URL: ?schoolId=xxx もしくは ?school=xxx）"
      );
      return;
    }

    // Q1〜Q6 が埋まっているかチェック
    const missing: string[] = [];
    (["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"] as DiagnosisQuestionId[]).forEach(
      (id) => {
        if (!finalAnswers[id]) missing.push(id);
      }
    );

    if (missing.length > 0) {
      setError(`未回答の質問があります: ${missing.join(", ")}`);
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/diagnosis/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, answers: finalAnswers }),
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
    if (!currentQuestion) return;

    const isLastStep =
      qId === currentQuestion.id && stepIndex === totalSteps - 1;

    setAnswers((prev) => {
      const next = { ...prev, [qId]: optionId };

      if (qId === currentQuestion.id) {
        if (isLastStep) {
          setTimeout(() => {
            void handleSubmit(next);
          }, 0);
        } else {
          setTimeout(() => {
            setStepIndex((s) => s + 1);
            setError(null);
          }, 150);
        }
      }

      return next;
    });
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
    // ✅ 表示する講師（instructors があればそれ優先）
    const instructors = result.instructors ?? [];
    const hasInstructors = instructors.length > 0;

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

          {/* ✅ 担当講師：instructors があれば一覧、無ければ従来 teacher を表示 */}
          <div className="mt-3">
            <div className="text-xs font-semibold text-gray-500">担当講師</div>

            {hasInstructors ? (
              <div className="mt-2 space-y-2">
                {instructors.map((t) => (
                  <div key={t.id} className="flex items-center gap-3">
                    {t.photoUrl ? (
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={t.photoUrl}
                          alt={t.label}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-200" />
                    )}

                    <div className="text-sm font-semibold">{t.label}</div>
                  </div>
                ))}
              </div>
            ) : (
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
            )}
          </div>
        </div>

        {/* ✅ 校舎情報（campus / selectedCampus どちらでも表示） */}
        {(() => {
          const c = result.campus ?? result.selectedCampus;
          if (!c) return null;

          return (
            <div className="mb-4 rounded-2xl bg-gray-50 p-4">
              <div className="text-xs font-semibold text-gray-500">
                選択した校舎
              </div>
              <div className="mt-1 text-lg font-bold">{c.label}</div>

              {(c.address || c.access || c.googleMapUrl) && (
                <div className="mt-3 space-y-2 text-xs text-gray-700">
                  {c.address ? (
                    <div>
                      <div className="font-semibold text-gray-500">住所</div>
                      <div className="whitespace-pre-wrap">{c.address}</div>
                    </div>
                  ) : null}

                  {c.access ? (
                    <div>
                      <div className="font-semibold text-gray-500">
                        アクセス
                      </div>
                      <div className="whitespace-pre-wrap">{c.access}</div>
                    </div>
                  ) : null}

                  {c.googleMapUrl ? (
                    <a
                      href={c.googleMapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      Googleマップで見る
                    </a>
                  ) : null}
                </div>
              )}
            </div>
          );
        })()}

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

      {/* ステップインジケータ */}
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

      {/* 質問項目 */}
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        {currentQuestion.options.map((opt) => {
          const selected = answers[currentQuestion.id] === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
              className={[
                "flex h-full items-start rounded-2xl border px-3 py-3 text-left text-xs transition",
                selected
                  ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-gray-200 bg-white text-gray-800 hover:border-blue-300 hover:bg-blue-50/40",
              ].join(" ")}
            >
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

      {/* フッター */}
      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          className="text-xs text-gray-500 underline disabled:opacity-40"
          onClick={handlePrev}
          disabled={stepIndex === 0 || isSubmitting}
        >
          戻る
        </button>

        {stepIndex === totalSteps - 1 && (
          <button
            type="button"
            className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            onClick={() => void handleSubmit()}
            disabled={!canGoNext || isSubmitting}
          >
            {isSubmitting ? "診断中..." : "診断結果を見る"}
          </button>
        )}
      </div>

      {!schoolId && (
        <div className="mt-2 text-[10px] text-red-400">
          ※ URLクエリ param「schoolId」または「school」が指定されていません。
          <br />
          例: <code className="rounded bg-gray-100 px-1">?schoolId=links</code>
        </div>
      )}
    </div>
  );
}
