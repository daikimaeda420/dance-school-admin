// app/(embed)/embed/diagnosis/DiagnosisEmbedClient.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  QUESTIONS,
  DiagnosisQuestionId,
  DiagnosisQuestionOption,
} from "@/lib/diagnosis/config";

type AnswersState = Partial<Record<DiagnosisQuestionId, string>>;

// ✅ 講師（DiagnosisInstructor を表示する用）
type DiagnosisInstructorVM = {
  id: string;
  label: string;
  slug: string;
  photoUrl?: string | null;

  // ✅ 追加：講師の魅力タグ/紹介文
  charmTags?: string | null;
  introduction?: string | null;
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

  teacher: {
    id?: string;
    name?: string;
    photoUrl?: string | null;
    styles: string[];
  };

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
    address?: string | null;
    access?: string | null;

    // 新キー
    googleMapUrl?: string | null;
    googleMapEmbedUrl?: string | null;

    // 旧キー（result API が旧形式で返す場合の保険）
    mapLinkUrl?: string | null;
    mapEmbedUrl?: string | null;
  };

  selectedCampus?: {
    label: string;
    slug: string;
    address?: string | null;
    access?: string | null;

    // 新キー
    googleMapUrl?: string | null;
    googleMapEmbedUrl?: string | null;

    // 旧キー（result API が旧形式で返す場合の保険）
    mapLinkUrl?: string | null;
    mapEmbedUrl?: string | null;
  };

  selectedGenre?: {
    id: string;
    label: string;
    slug: string;
    answerTag?: string;
  } | null;

  resultCopy?: {
    level?: string | null;
    age?: string | null;
    teacher?: string | null;
    concern?: string | null;
  };
};

type Props = {
  schoolIdProp?: string;
  onClose?: () => void;

  // 既存：親から渡せる場合は優先する
  campusOptions?: DiagnosisQuestionOption[];
  courseOptions?: DiagnosisQuestionOption[];
  genreOptions?: DiagnosisQuestionOption[];
  instructorOptions?: DiagnosisQuestionOption[];
};

// ✅ charmTags を柔軟に分割（"K-POP, HIPHOP" / "K-POP / HIPHOP" / 改行 などOK）
function splitCharmTags(input?: string | null): string[] {
  const s = String(input ?? "").trim();
  if (!s) return [];
  return s
    .split(/[,、\/|]\s*|\n+/g)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12);
}

/**
 * - 前後空白除去
 * - <iframe ...> が入ってたら src を抽出
 * - "src=..." 形式も許可
 */
function normalizeEmbedInput(input: unknown): string {
  const s = String(input ?? "").trim();
  if (!s) return "";

  if (s.includes("<iframe")) {
    const m = s.match(/src\s*=\s*["']([^"']+)["']/i);
    return m?.[1] ? String(m[1]).trim() : "";
  }
  if (s.startsWith("src=")) {
    const m = s.match(/src\s*=\s*["']?([^"'\s>]+)["']?/i);
    return m?.[1] ? String(m[1]).trim() : "";
  }
  return s;
}

/**
 * 結果APIの互換キーも拾って iframe src / link を決定する
 * - googleMapEmbedUrl / mapEmbedUrl を両対応
 * - googleMapUrl / mapLinkUrl を両対応
 */
function pickCampusMapFields(c: any): { embedSrc: string; linkUrl: string } {
  const embedRaw =
    c?.googleMapEmbedUrl ?? c?.mapEmbedUrl ?? c?.google_map_embed_url ?? null;

  const linkRaw = c?.googleMapUrl ?? c?.mapLinkUrl ?? c?.google_map_url ?? null;

  const embedSrc = normalizeEmbedInput(embedRaw);
  const linkUrl = String(linkRaw ?? "").trim();

  return { embedSrc, linkUrl };
}

export default function DiagnosisEmbedClient({
  schoolIdProp,
  onClose,
  campusOptions: campusOptionsProp,
}: Props) {
  const searchParams = useSearchParams();

  const [answers, setAnswers] = useState<AnswersState>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ schoolId / school どっちでも受ける
  const schoolId = useMemo(() => {
    if (schoolIdProp) return schoolIdProp;
    return searchParams.get("schoolId") ?? searchParams.get("school") ?? "";
  }, [schoolIdProp, searchParams]);

  // =========================================================
  // ✅ Q1 校舎 options を API から取得（フラッシュ対策）
  // =========================================================
  const [campusOptions, setCampusOptions] = useState<DiagnosisQuestionOption[]>(
    campusOptionsProp ?? [],
  );
  const [campusLoaded, setCampusLoaded] = useState<boolean>(
    (campusOptionsProp?.length ?? 0) > 0,
  );
  const [campusLoading, setCampusLoading] = useState<boolean>(false);

  // 親から渡された options が変わったら反映
  useEffect(() => {
    if ((campusOptionsProp?.length ?? 0) > 0) {
      setCampusOptions(campusOptionsProp ?? []);
      setCampusLoaded(true);
    }
  }, [campusOptionsProp]);

  // schoolId が変わったら校舎を取り直し & 途中回答の混在を防ぐ
  useEffect(() => {
    setAnswers({});
    setStepIndex(0);
    setResult(null);
    setError(null);

    // 親から来てるなら fetch 不要
    if ((campusOptionsProp?.length ?? 0) > 0) {
      setCampusLoaded(true);
      setCampusLoading(false);
      return;
    }

    if (!schoolId) {
      setCampusOptions([]);
      setCampusLoaded(false);
      setCampusLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    setCampusLoading(true);
    setCampusLoaded(false);
    setCampusOptions([]);

    // ✅ 速度優先：no-store を外す（Nextのfetchキャッシュ/ブラウザキャッシュを効かせる）
    // ※校舎が頻繁に変わるなら、API側で revalidate を付けるのが推奨
    fetch(`/api/diagnosis/campuses?schoolId=${encodeURIComponent(schoolId)}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        const opts = Array.isArray(data) ? (data as any[]) : [];
        setCampusOptions(
          opts
            .map((x) => ({ id: String(x.id), label: String(x.label) }))
            .filter((x) => x.id && x.label),
        );
        setCampusLoaded(true);
      })
      .catch((e) => {
        if (cancelled) return;
        if ((e as any)?.name === "AbortError") return;
        console.error("Failed to load campuses:", e);
        setCampusOptions([]);
        setCampusLoaded(true);
      })
      .finally(() => {
        if (cancelled) return;
        setCampusLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  // ✅ Q1のみ管理画面連動、Q2〜Q6は固定
  // ★フラッシュ対策：campusLoaded までは Q1 を空 options にする
  const questions = useMemo(() => {
    return QUESTIONS.map((q) => {
      if (q.id !== "Q1") return q;

      if (!campusLoaded)
        return { ...q, options: [] as DiagnosisQuestionOption[] };

      return { ...q, options: campusOptions };
    });
  }, [campusLoaded, campusOptions]);

  const currentQuestion = questions[stepIndex];
  const totalSteps = questions.length;

  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;

  const canGoNext = !!currentAnswer || !!result;

  // -----------------------
  // 診断実行
  // -----------------------
  const handleSubmit = async (answersOverride?: AnswersState) => {
    const finalAnswers = answersOverride ?? answers;

    if (!schoolId) {
      setError(
        "schoolId が指定されていません。（URL: ?schoolId=xxx もしくは ?school=xxx）",
      );
      return;
    }

    const missing: string[] = [];
    (["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"] as DiagnosisQuestionId[]).forEach(
      (id) => {
        if (!finalAnswers[id]) missing.push(id);
      },
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
  // 選択 → 自動で次へ / 最後なら自動診断
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
            あなたにおすすめのクラスは
          </div>

          {(() => {
            const className = result.bestMatch.className ?? "おすすめクラス";

            const genreLabel =
              result.selectedGenre?.label?.trim() ||
              (result.bestMatch.genres?.[0] ?? "").trim();

            const genreId = result.selectedGenre?.id;
            const genreImgSrc = genreId
              ? `/api/diagnosis/genres/image?id=${encodeURIComponent(
                  genreId,
                )}&schoolId=${encodeURIComponent(schoolId)}`
              : null;

            return (
              <div className="mt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-lg font-bold">
                    {genreLabel}&nbsp;{className}
                  </div>
                </div>

                {genreImgSrc && (
                  <div className="mt-3">
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={genreImgSrc}
                        alt={
                          genreLabel ? `${genreLabel}の画像` : "ジャンル画像"
                        }
                        className="h-40 w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="mt-1 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {result.headerLabel}
          </div>

          {/* ✅ 担当講師の上：診断コピー（resultCopy） */}
          {result.resultCopy && (
            <div className="mt-4 space-y-3">
              {result.resultCopy.level && (
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold text-gray-500">
                    あなたのレベルに合わせた提案
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-gray-800">
                    {result.resultCopy.level}
                  </div>
                </div>
              )}

              {result.resultCopy.age && (
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold text-gray-500">
                    ライフスタイルに合わせた提案
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-gray-800">
                    {result.resultCopy.age}
                  </div>
                </div>
              )}

              {result.resultCopy.teacher && (
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold text-gray-500">
                    先生のタイプに合わせた提案
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-gray-800">
                    {result.resultCopy.teacher}
                  </div>
                </div>
              )}

              {result.resultCopy.concern && (
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold text-gray-500">
                    不安への回答
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-gray-800">
                    {result.resultCopy.concern}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ✅ 担当講師 */}
          <div className="mt-3">
            <div className="text-xs font-semibold text-gray-500">担当講師</div>

            {hasInstructors ? (
              <div className="mt-2 space-y-3">
                {instructors.map((t) => {
                  const tags = splitCharmTags(t.charmTags);
                  const intro = String(t.introduction ?? "").trim();

                  return (
                    <div
                      key={t.id}
                      className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-24 w-24 overflow-hidden rounded-2xl bg-gray-200">
                          {t.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={t.photoUrl}
                              alt={t.label}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-xl font-extrabold tracking-tight">
                            {t.label}
                          </div>

                          {tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {tags.map((tag, idx) => (
                                <span
                                  key={`${t.id}_tag_${idx}`}
                                  className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {intro && (
                        <div className="mt-4">
                          <div className="relative rounded-2xl bg-gray-100 px-4 py-3 text-sm leading-relaxed text-gray-700">
                            <div className="absolute -top-2 left-10 h-4 w-4 rotate-45 bg-gray-100" />
                            <span className="whitespace-pre-wrap">{intro}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                      スタイル：{result.teacher.styles.join(" / ")}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ✅ 校舎情報 */}
        {(() => {
          const c = result.campus ?? result.selectedCampus;
          if (!c) return null;

          const { embedSrc, linkUrl } = pickCampusMapFields(c);

          return (
            <div className="mb-4 rounded-2xl bg-gray-50 p-4">
              <div className="text-xs font-semibold text-gray-500">
                選択した校舎
              </div>
              <div className="mt-1 text-lg font-bold">{c.label}</div>

              {(c.address || c.access || embedSrc || linkUrl) && (
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

                  {/* ✅ リンクの上に iframe */}
                  {embedSrc ? (
                    <div className="pt-2">
                      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                        <iframe
                          src={embedSrc}
                          className="h-64 w-full"
                          style={{ border: 0 }}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    </div>
                  ) : null}

                  {/* ✅ iframeの下にリンク */}
                  {linkUrl ? (
                    <a
                      href={linkUrl}
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

        {/* マッチング分析 */}
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

        {/* CTA */}
        <div className="mt-2 flex flex-col gap-2">
          <a
            href={
              result.bestMatch.classId
                ? `/reserve?classId=${encodeURIComponent(
                    result.bestMatch.classId,
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
  const isQ1 = currentQuestion?.id === "Q1";

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

        {/* ✅ Q1ローディング表示（フラッシュ対策の見た目） */}
        {isQ1 && campusLoading && (
          <div className="mt-2 text-[11px] text-gray-400">
            校舎一覧を読み込み中...
          </div>
        )}
      </div>

      {/* 質問項目 */}
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        {(() => {
          const isQ1Local = currentQuestion.id === "Q1";

          // ✅ Q1 は校舎が取れるまで「何も描画しない」(空枠も出さない)
          if (isQ1Local && !campusLoaded) return null;

          // ✅ options が 0 件なら空表示
          if (currentQuestion.options.length === 0) {
            return (
              <div className="md:col-span-2 text-center text-xs text-gray-400">
                選択肢がありません。
              </div>
            );
          }

          return currentQuestion.options.map((opt) => {
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
          });
        })()}
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
