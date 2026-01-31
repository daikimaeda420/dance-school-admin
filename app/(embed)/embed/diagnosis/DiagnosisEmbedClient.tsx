// app/(embed)/embed/diagnosis/DiagnosisEmbedClient.tsx
"use client";

import styles from "./DiagnosisEmbedClient.module.css";
import type { ResultCopy } from "@/lib/diagnosis/resultCopy";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import DiagnosisForm from "./_components/DiagnosisForm";
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

  selectedCourse?: {
    id: string; // DiagnosisCourse.id（cuid）
    label: string;
    slug: string;
    answerTag?: string | null;
    photoUrl?: string | null; // 返せるならベスト（なければクライアント側で生成）
  } | null;

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
    level?: ResultCopy | null;
    age?: ResultCopy | null;
    teacher?: ResultCopy | null;
    concern?: string | null; // concernは今はstringのままでOK
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
  const [diagnosisForm, setDiagnosisForm] = useState<any | null>(null);

  type PublicScheduleSlot = {
    id: string;
    genreText: string;
    timeText: string;
    teacher: string;
    place: string;
  };

  type PublicSchedule = Record<
    "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN",
    PublicScheduleSlot[]
  >;

  const [schedule, setSchedule] = useState<PublicSchedule | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

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
  // 診断結果フォーム取得
  // ==========================
  useEffect(() => {
    if (!result || !schoolId) return;
    fetch(`/api/diagnosis/form?schoolId=${encodeURIComponent(schoolId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setDiagnosisForm(data);
      })
      .catch(() => {
        setDiagnosisForm(null);
      });
  }, [result, schoolId]);

  useEffect(() => {
    if (!result || !schoolId) return;

    const courseId = result.selectedCourse?.id ?? result.bestMatch?.classId;
    if (!courseId) return;

    let cancelled = false;
    const controller = new AbortController();

    setSchedule(null);
    setScheduleError(null);

    fetch(
      `/api/diagnosis/schedule?schoolId=${encodeURIComponent(
        schoolId,
      )}&courseId=${encodeURIComponent(courseId)}`,
      { signal: controller.signal },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;

        const resolved =
          data?.schedule ??
          data?.data?.schedule ??
          data?.result?.schedule ??
          null;

        setSchedule(resolved);
      })
      .catch((e) => {
        if (cancelled) return;
        if ((e as any)?.name === "AbortError") return;
        console.error("Failed to load schedule:", e);
        setSchedule(null);
        setScheduleError("スケジュールの取得に失敗しました");
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [result, schoolId]);

  // ==========================
  // 診断結果画面
  // ==========================
  if (result) {
    const instructors = result.instructors ?? [];
    const hasInstructors = instructors.length > 0;

    return (
      <div className={styles.root}>
        <div className={styles.panel}>
          {/* ヘッダー */}
          <div className={styles.header}>
            <div>
              <div className={styles.header__label}>マッチ度</div>
              <div className={styles.header__score}>
                {result.score}
                <span className={styles.scoreSmall}> / 100</span>
              </div>
              {result.patternMessage && (
                <div className={styles.helperText}>{result.patternMessage}</div>
              )}
            </div>

            {onClose && (
              <button
                type="button"
                className={styles.closeBtn}
                onClick={onClose}
              >
                ✕
              </button>
            )}
          </div>

          {/* メイン提案エリア */}
          <div className={styles.sectionSoft}>
            <div className={styles.sectionTitle}>
              あなたにおすすめのクラスは
            </div>

            {(() => {
              const className = result.bestMatch.className ?? "おすすめクラス";

              const genreLabel =
                result.selectedGenre?.label?.trim() ||
                (result.bestMatch.genres?.[0] ?? "").trim();

              const rawCoursePhotoUrl = result.selectedCourse?.photoUrl ?? null;
              const coursePhotoUrl = rawCoursePhotoUrl
                ? `${rawCoursePhotoUrl}${rawCoursePhotoUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(
                    String(result.selectedCourse?.id ?? ""),
                  )}`
                : null;

              const fallbackCourseImgSrc =
                !coursePhotoUrl && result.selectedCourse?.id
                  ? `/api/diagnosis/courses/photo?schoolId=${encodeURIComponent(
                      schoolId,
                    )}&id=${encodeURIComponent(result.selectedCourse.id)}`
                  : null;

              const genreId = result.selectedGenre?.id;
              const genreImgSrc =
                !coursePhotoUrl && !fallbackCourseImgSrc && genreId
                  ? `/api/diagnosis/genres/image?id=${encodeURIComponent(
                      String(genreId),
                    )}&schoolId=${encodeURIComponent(schoolId)}`
                  : null;

              const imgSrc =
                coursePhotoUrl || fallbackCourseImgSrc || genreImgSrc || null;

              const titleText = className;

              return (
                <div>
                  <div className={styles.bigTitle}>{titleText}</div>

                  {imgSrc && (
                    <div className={styles.mediaImgWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgSrc}
                        alt={
                          coursePhotoUrl || fallbackCourseImgSrc
                            ? `${titleText}の画像`
                            : genreLabel
                              ? `${genreLabel}の画像`
                              : "診断結果画像"
                        }
                        className={styles.mediaImg}
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>
              );
            })()}

            <div className={styles.pill}>{result.headerLabel}</div>

            {/* ✅ 担当講師の上：診断コピー（resultCopy） */}
            {result.resultCopy && (
              <div className={styles.cardStack}>
                {result.resultCopy.level && (
                  <div className={styles.card}>
                    <div className={styles.cardLead}>
                      あなたのレベルに合わせた提案
                    </div>
                    <div className={styles.cardTitle}>
                      {result.resultCopy.level.title}
                    </div>
                    <div className={styles.cardBody}>
                      {result.resultCopy.level.body}
                    </div>
                  </div>
                )}

                {result.resultCopy.age && (
                  <div className={styles.card}>
                    <div className={styles.cardLead}>
                      ライフスタイルに合わせた提案
                    </div>
                    <div className={styles.cardTitle}>
                      {result.resultCopy.age.title}
                    </div>
                    <div className={styles.cardBody}>
                      {result.resultCopy.age.body}
                    </div>
                  </div>
                )}

                {result.resultCopy.teacher && (
                  <div className={styles.card}>
                    <div className={styles.cardLead}>
                      先生のタイプに合わせた提案
                    </div>
                    <div className={styles.cardTitle}>
                      {result.resultCopy.teacher.title}
                    </div>
                    <div className={styles.cardBody}>
                      {result.resultCopy.teacher.body}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 不安解消メッセージ */}
            <div className={styles.concern}>
              <div className={styles.concernTitle}>
                こんな不安はありませんか？
              </div>
              <div className="whitespace-pre-wrap">
                {result.resultCopy?.concern ?? result.concernMessage}
              </div>
            </div>

            {/* ✅ 担当講師 */}
            <div className={styles.instructorWrap}>
              <div className={styles.sectionTitle}>担当講師</div>

              {hasInstructors ? (
                <div className={styles.cardStack}>
                  {instructors.map((t) => {
                    const tags = splitCharmTags(t.charmTags);
                    const intro = String(t.introduction ?? "").trim();

                    return (
                      <div key={t.id} className={styles.instructorCard}>
                        <div className={styles.instructorRow}>
                          <div className={styles.avatar}>
                            {t.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={t.photoUrl} alt={t.label} />
                            ) : null}
                          </div>

                          <div className="min-w-0">
                            <div className={styles.instructorName}>
                              {t.label}
                            </div>

                            {tags.length > 0 && (
                              <div className={styles.tags}>
                                {tags.map((tag, idx) => (
                                  <span
                                    key={`${t.id}_tag_${idx}`}
                                    className={styles.tag}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {intro && (
                          <div className={styles.bubble}>
                            <span className="whitespace-pre-wrap">{intro}</span>
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

          {/* ✅ スケジュール（担当講師の下に表示） */}
          <div>
            <div className={styles.blockTitle}>スケジュール</div>

            {scheduleError && (
              <div className="mt-2 rounded-md bg-red-50 px-3 py-2 text-[11px] text-red-600">
                {scheduleError}
              </div>
            )}

            {(() => {
              const s = schedule;
              const total = s
                ? (Object.values(s).reduce(
                    (sum, arr) => sum + arr.length,
                    0,
                  ) as number)
                : 0;

              if (!s || total === 0) {
                return (
                  <div className="mt-2 text-[11px] text-gray-400">
                    現在、該当するスケジュールはありません。
                  </div>
                );
              }

              return (
                <div className="mt-2">
                  {(
                    [
                      ["MON", "月"],
                      ["TUE", "火"],
                      ["WED", "水"],
                      ["THU", "木"],
                      ["FRI", "金"],
                      ["SAT", "土"],
                      ["SUN", "日"],
                    ] as const
                  ).map(([key, label]) => {
                    const items = s[key] ?? [];
                    return (
                      <div key={key}>
                        <div className={styles.scheduleDay}>{label}</div>

                        <div className="mt-2">
                          {items.length === 0 ? (
                            <div className="text-xs text-gray-500">なし</div>
                          ) : (
                            items.map((slot) => (
                              <div
                                key={slot.id}
                                className={styles.scheduleItem}
                              >
                                <div className={styles.scheduleMain}>
                                  {slot.genreText} / {slot.timeText}
                                </div>
                                <div className={styles.scheduleSub}>
                                  講師：{slot.teacher}
                                </div>
                                <div className={styles.scheduleSub}>
                                  場所：{slot.place}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* ✅ 校舎情報 */}
          {(() => {
            const c = result.campus ?? result.selectedCampus;
            if (!c) return null;

            const { embedSrc, linkUrl } = pickCampusMapFields(c);

            return (
              <div className={styles.campusBox}>
                <div className={styles.sectionTitle}>選択した校舎</div>
                <div className={styles.bigTitle}>{c.label}</div>

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

                    {embedSrc ? (
                      <div className={styles.mapFrame}>
                        <iframe
                          src={embedSrc}
                          className={styles.mapIframe}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    ) : null}

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
          <div className={styles.analysisBox}>
            <div className={styles.blockTitle}>マッチング分析</div>

            <div className="mt-2 grid gap-2">
              {result.breakdown.length === 0 && (
                <div className="rounded-md bg-green-50 px-2 py-1 text-xs text-green-700">
                  すべての項目でほぼ理想的なマッチングです。
                </div>
              )}
              {result.breakdown.map((b, idx) => (
                <div key={idx} className={styles.analysisRow}>
                  <div className={styles.analysisKey}>
                    {b.key === "level" && "レベル"}
                    {b.key === "genre" && "ジャンル"}
                    {b.key === "age" && "年代"}
                    {b.key === "teacher" && "先生のスタイル"}
                  </div>
                  <div className={styles.analysisNote}>{b.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className={styles.ctaStack}>
            <a
              href={
                result.bestMatch.classId
                  ? `/reserve?classId=${encodeURIComponent(
                      result.bestMatch.classId,
                    )}`
                  : "/reserve"
              }
              className={styles.ctaPrimary}
            >
              このクラスの体験レッスンを予約する
            </a>
            <button
              type="button"
              className={styles.ctaLink}
              onClick={handleRestart}
            >
              診断をやり直す
            </button>
          </div>

          {/* ==========================
              診断結果フォーム
          ========================== */}
          {diagnosisForm && (
            <div className="mt-4">
              <DiagnosisForm
                form={diagnosisForm}
                hiddenValues={{
                  schoolId,
                  campus:
                    result.campus?.label ?? result.selectedCampus?.label ?? "",
                  campusSlug:
                    result.campus?.slug ?? result.selectedCampus?.slug ?? "",
                  genre: result.selectedGenre?.label ?? "",
                  genreSlug:
                    result.selectedGenre?.answerTag ??
                    result.selectedGenre?.slug ??
                    "",
                  score: String(result.score),
                  pattern: result.pattern,
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================
  // 質問ステップ画面
  // ==========================
  const isQ1 = currentQuestion?.id === "Q1";

  return (
    <div className={styles.shell}>
      <div className={styles.panel}>
        {/* 上部ヘッダー */}
        <div className={styles.headerRow}>
          <div>
            <div className={styles.qHeaderKicker}>ダンススクール相性診断</div>
            <div className={styles.qHeaderTitle}>
              あなたに「運命のクラス」が見つかる！
            </div>
          </div>

          {onClose && (
            <button type="button" className={styles.closeBtn} onClick={onClose}>
              ✕
            </button>
          )}
        </div>

        {/* ステップインジケータ */}
        <div className={styles.stepWrap}>
          <div className={styles.stepDots}>
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className={[
                  styles.stepDot,
                  idx === stepIndex
                    ? styles.stepDotActive
                    : idx < stepIndex
                      ? styles.stepDotDone
                      : "",
                ].join(" ")}
              />
            ))}
          </div>
          <div className={styles.helperText}>
            質問 {stepIndex + 1} / {totalSteps}
          </div>
        </div>

        {/* 質問タイトル */}
        <div className={styles.qTitleWrap}>
          <div className={styles.qTitle}>{currentQuestion.title}</div>
          {currentQuestion.description && (
            <div className={styles.qDesc}>{currentQuestion.description}</div>
          )}

          {/* ✅ Q1ローディング表示（フラッシュ対策の見た目） */}
          {isQ1 && campusLoading && (
            <div className={styles.helperText}>校舎一覧を読み込み中...</div>
          )}
        </div>

        {/* 質問項目 */}
        <div className={styles.optionGrid}>
          {(() => {
            const isQ1Local = currentQuestion.id === "Q1";

            if (isQ1Local && !campusLoaded) return null;

            if (currentQuestion.options.length === 0) {
              return (
                <div className="text-center text-xs text-gray-400">
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
                    styles.optionBtn,
                    selected ? styles.optionBtnSelected : "",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              );
            });
          })()}
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="mt-3 rounded-md bg-red-50 px-2 py-1 text-[11px] text-red-600">
            {error}
          </div>
        )}

        {/* フッター */}
        <div className={styles.qFooter}>
          <button
            type="button"
            className={styles.qBack}
            onClick={handlePrev}
            disabled={stepIndex === 0 || isSubmitting}
          >
            戻る
          </button>

          {stepIndex === totalSteps - 1 && (
            <button
              type="button"
              className={styles.qSubmit}
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
            例:{" "}
            <code className="rounded bg-gray-100 px-1">?schoolId=links</code>
          </div>
        )}
      </div>
    </div>
  );
}
