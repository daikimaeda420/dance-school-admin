// app/(embed)/embed/diagnosis/DiagnosisEmbedClient.tsx
"use client";

import styles from "./DiagnosisEmbedClient.module.scss";
import type { ResultCopy } from "@/lib/diagnosis/resultCopy";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import DiagnosisForm from "./_components/DiagnosisForm";
import ResultHero from "./_components/ResultHero";
import ReasonCards from "./_components/ReasonCards";
import InstructorCards from "./_components/InstructorCards";
import ScheduleSection from "./_components/ScheduleSection";
import ResultSections from "./_components/ResultSections";
import ClassIntroduction from "./_components/ClassIntroduction";
import {
  QUESTIONS,
  DiagnosisQuestionId,
  DiagnosisQuestionOption,
} from "@/lib/diagnosis/config";

// ✅ APIから取得するFAQの型
type ApiFaqItem = {
  type: "question" | "select";
  question: string;
  answer?: string;
  options?: { label: string; next: any }[];
};

// ✅ APIから取得するコースの型
type ApiCourse = {
  id: string;
  label: string;
  slug: string;
  // 必要に応じて追加
};

type AnswersState = Partial<Record<DiagnosisQuestionId, string>>;

// ✅ 講師（DiagnosisInstructor を表示する用）
type DiagnosisInstructorVM = {
  id: string;
  label: string;
  slug: string;
  photoUrl?: string | null;
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
    key: "level" | "age" | "teacher";
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
    googleMapUrl?: string | null;
    googleMapEmbedUrl?: string | null;
    mapLinkUrl?: string | null;
    mapEmbedUrl?: string | null;
  };

  selectedCourse?: {
    id: string;
    label: string;
    slug: string;
    answerTag?: string | null;
    photoUrl?: string | null;
    description?: string | null;
  } | null;

  selectedCampus?: {
    label: string;
    slug: string;
    address?: string | null;
    access?: string | null;
    googleMapUrl?: string | null;
    googleMapEmbedUrl?: string | null;
    mapLinkUrl?: string | null;
    mapEmbedUrl?: string | null;
  };

  resultCopy?: {
    level?: ResultCopy | null;
    age?: ResultCopy | null;
    teacher?: ResultCopy | null;
    concern?: string | null;
  };
};

type Props = {
  schoolIdProp?: string;
  onClose?: () => void;
  campusOptions?: DiagnosisQuestionOption[];
  courseOptions?: DiagnosisQuestionOption[];
  instructorOptions?: DiagnosisQuestionOption[];
  activeGenreTags?: string[];
  activeLifestyleTags?: string[];
};

export default function DiagnosisEmbedClient({
  schoolIdProp,
  onClose,
  campusOptions: campusOptionsProp,
  activeGenreTags,
  activeLifestyleTags,
}: Props) {
  const searchParams = useSearchParams();

  // ✅ schoolId / school どっちでも受ける
  const schoolId = useMemo(() => {
    if (schoolIdProp) return schoolIdProp;
    return searchParams.get("schoolId") ?? searchParams.get("school") ?? "";
  }, [schoolIdProp, searchParams]);

  const [answers, setAnswers] = useState<AnswersState>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnosisForm, setDiagnosisForm] = useState<any | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  // ✅ フォーム監視用
  const formRef = useRef<HTMLDivElement>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  useEffect(() => {
    if (!formRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFormVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(formRef.current);
    return () => observer.disconnect();
  }, [diagnosisForm]); // diagnosisForm がロードされたら監視開始

  // ✅ FAQ取得
  const [fetchedFaqs, setFetchedFaqs] = useState<{ q: string; a: string }[]>(
    [],
  );
  useEffect(() => {
    if (!schoolId) return;
    fetch(`/api/faq?school=${encodeURIComponent(schoolId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.items) return;
        // ResultSections用に変換 (type="question" のみ抽出)
        const validItems = (data.items as ApiFaqItem[])
          .filter(
            (item) => item.type === "question" && item.question && item.answer,
          )
          .map((item) => ({
            q: item.question,
            a: item.answer || "",
          }));
        setFetchedFaqs(validItems);
      })
      .catch((e) => console.error("Failed to load FAQs:", e));
  }, [schoolId]);

  // ✅ コース取得
  const [fetchedCourses, setFetchedCourses] = useState<ApiCourse[]>([]);
  useEffect(() => {
    if (!schoolId) return;
    fetch(`/api/diagnosis/courses?schoolId=${encodeURIComponent(schoolId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data)) {
          setFetchedCourses(data as ApiCourse[]);
        }
      })
      .catch((e) => console.error("Failed to load courses:", e));
  }, [schoolId]);

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

  const [scheduleDay, setScheduleDay] = useState<
    "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN"
  >("MON");

  const [schedule, setSchedule] = useState<PublicSchedule | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);



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

  // ✅ Q1のみ管理画面連動、Q2〜Q5は固定
  const questions = useMemo(() => {
    return QUESTIONS.map((q) => {
      if (q.id === "Q1") {
        if (!campusLoaded)
          return { ...q, options: [] as DiagnosisQuestionOption[] };
        return { ...q, options: campusOptions };
      }

      // ✅ Q4: ジャンルフィルター
      if (q.id === "Q4" && activeGenreTags && activeGenreTags.length > 0) {
        // activeGenreTags に含まれるタグだけを残す
        const filtered = q.options.filter((opt) => {
          if (!opt.tag) return true;
          // "Genre_None" は常に表示
          if (opt.tag === "Genre_None") return true;
          return activeGenreTags.includes(opt.tag);
        });
        return { ...q, options: filtered };
      }

      // ✅ Q3: 年代フィルター
      if (
        q.id === "Q3" &&
        activeLifestyleTags &&
        activeLifestyleTags.length > 0
      ) {
        const filtered = q.options.filter((opt) => {
          if (!opt.tag) return true;
          return activeLifestyleTags.includes(opt.tag);
        });

        // DEBUG:
        console.log("Q3 Filtering:", {
          activeLifestyleTags,
          allOptions: q.options.map((o) => o.tag),
          filteredOptions: filtered.map((o) => o.tag),
        });

        // フィルタリング結果が0件になってしまう場合は、全表示に戻す（設定ミスの可能性への安全策）
        if (filtered.length === 0) {
          return q;
        }

        return { ...q, options: filtered };
      }

      return q;
    });
  }, [campusLoaded, campusOptions, activeGenreTags, activeLifestyleTags]);

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

  // ==========================
  // スケジュール取得
  // ==========================
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
  // ✅ 結果画面で使う派生値
  // ==========================
  const instructors = result?.instructors ?? [];
  const className = result?.bestMatch?.className ?? "おすすめクラス";

  const rawCoursePhotoUrl = result?.selectedCourse?.photoUrl ?? null;

  const coursePhotoUrl = rawCoursePhotoUrl
    ? `${rawCoursePhotoUrl}${rawCoursePhotoUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(
        String(result?.selectedCourse?.id ?? ""),
      )}`
    : null;

  const fallbackCourseImgSrc =
    !coursePhotoUrl && result?.selectedCourse?.id
      ? `/api/diagnosis/courses/photo?schoolId=${encodeURIComponent(
          schoolId,
        )}&id=${encodeURIComponent(result.selectedCourse.id)}`
      : null;

  const imgSrc = coursePhotoUrl || fallbackCourseImgSrc || null;

  // ✅ DiagnosisForm 用 option 生成
  const dayOrder = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
  type DayKey = (typeof dayOrder)[number];
  const dayLabel: Record<DayKey, string> = {
    MON: "月",
    TUE: "火",
    WED: "水",
    THU: "木",
    FRI: "金",
    SAT: "土",
    SUN: "日",
  };

  const classOptions = useMemo(() => {
    if (!schedule) return [];

    const list = (schedule[scheduleDay] ?? []).map((s) => ({
      ...s,
      weekday: scheduleDay as DayKey,
    }));

    return list.map((s) => ({
      value: s.id,
      label: `${dayLabel[s.weekday as DayKey]} ${s.timeText} ${s.genreText}`,
    }));
  }, [schedule, scheduleDay]);

  const dateOptions = useMemo(() => {
    const want = 12;

    const targetDow =
      scheduleDay === "MON"
          ? 1
          : scheduleDay === "TUE"
            ? 2
            : scheduleDay === "WED"
              ? 3
              : scheduleDay === "THU"
                ? 4
                : scheduleDay === "FRI"
                  ? 5
                  : scheduleDay === "SAT"
                    ? 6
                    : 0;

    const out: { value: string; label: string }[] = [];
    const today = new Date();

    for (let i = 0; i < 60 && out.length < want; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (targetDow !== null && d.getDay() !== targetDow) continue;

      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const jp = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];

      out.push({
        value: `${y}-${m}-${dd}`,
        label: `${y}/${m}/${dd}（${jp}）`,
      });
    }
    return out;
  }, [scheduleDay]);

  // ==========================
  // ✅ CTAクリック（スクロール or 遷移）
  // ==========================
  const handleCtaClick = useCallback(() => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    } else if (result?.bestMatch?.classId) {
      window.location.href = `/reserve?classId=${encodeURIComponent(
        result.bestMatch.classId,
      )}`;
    } else {
      window.location.href = "/reserve";
    }
  }, [result]);

  // ==========================
  // ✅ 質問ステップ画面の判定
  // ==========================
  const isQ1 = currentQuestion?.id === "Q1";

  // ==========================
  // ✅ ここから描画（return は1回だけ）
  // ==========================
  return (
    <div className={styles.root}>
      {/* ✅ 画面全体：左右余白 + 縦余白 */}
      <div className="px-4 sm:px-6 py-4 sm:py-6">
        {/* ✅ 横幅統一：スマホ100% / PC中央寄せ */}
        <div className="mx-auto w-full max-w-[560px]">
          {result ? (
            // ==========================
            // ✅ 結果画面
            // ==========================
            <div className="space-y-8 sm:space-y-10">
              {/* 上：やり直し */}
              <div>
                <button
                  type="button"
                  className="text-xs text-gray-500 underline"
                  onClick={handleRestart}
                >
                  診断をやり直す
                </button>
              </div>

              {/* FV */}
              <ResultHero
                result={result}
                onClose={onClose}
                imgSrc={imgSrc}
                coursePhotoUrl={coursePhotoUrl}
                fallbackCourseImgSrc={fallbackCourseImgSrc}
                className={className}
                onCtaClick={handleCtaClick}
              />

              {/* おすすめ理由 */}
              <ReasonCards
                resultCopy={result.resultCopy}
                concernMessage={result.concernMessage}
              />

              {/* クラス紹介 */}
              {result.selectedCourse && (
                <ClassIntroduction
                  courseName={result.selectedCourse.label}
                  description={result.selectedCourse.description}
                />
              )}

              {/* 講師 */}
              <InstructorCards
                instructors={instructors}
                fallbackTeacher={result.teacher}
              />

              {/* スケジュール */}
              <ScheduleSection
                schedule={schedule}
                scheduleError={scheduleError}
                scheduleDay={scheduleDay}
                onScheduleDayChange={setScheduleDay}
              />

              {/* 料金・生徒の声・アクセス・体験の流れ・FAQ */}
                <ResultSections
                campus={result.campus ?? result.selectedCampus ?? null}
                faqs={fetchedFaqs} // ✅ 取得したFAQを渡す
                courses={fetchedCourses} // ✅ 取得したコースを渡す
                openIndex={openIndex}
                onToggleFaq={(i) => setOpenIndex(openIndex === i ? null : i)}
              />

              {/* CTA (フッター固定) - フォームが見えたら隠す */}
              <div
                className={`fixed bottom-0 left-0 z-50 w-full bg-white/90 backdrop-blur-sm p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-all duration-300 ${
                  isFormVisible
                    ? "pointer-events-none translate-y-full opacity-0"
                    : "translate-y-0 opacity-100"
                }`}
              >
                <div className="mx-auto max-w-[560px]">
                  <button
                    type="button"
                    onClick={handleCtaClick}
                    className="flex w-full max-w-[360px] mx-auto items-center justify-center rounded-full bg-[#f5c400] px-6 py-4 text-[18px] font-bold text-[#6b4a2b] shadow-lg transition-transform hover:scale-105 active:scale-95"
                  >
                    体験予約はコチラ
                  </button>
                </div>
              </div>

              {/* フッター固定分の余白 */}
              <div className="h-24" />

              {/* ✅ 診断結果フォーム（ここ1回だけ） */}
              {diagnosisForm && (
                <div ref={formRef}>
                  <DiagnosisForm
                    form={diagnosisForm}
                    hiddenValues={{
                      schoolId,
                      campus:
                        result.campus?.label ??
                        result.selectedCampus?.label ??
                        "",
                      campusSlug:
                        result.campus?.slug ??
                        result.selectedCampus?.slug ??
                        "",

                      score: String(result.score),
                      pattern: result.pattern,
                    }}
                    classOptions={classOptions}
                    dateOptions={dateOptions}
                  />
                </div>
              )}
            </div>
          ) : (
            // ==========================
            // ✅ 質問画面（横幅統一）
            // ==========================
            <div className="min-h-[100svh] w-full bg-[#faf5ee] px-4 py-6">
              <div className="mx-auto w-full max-w-[420px]">
                {/* 上部：戻る＋タイトル＋進捗 */}
                <div className="mb-4 flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#6b4a2b]/70 hover:text-[#6b4a2b]"
                    onClick={handlePrev}
                    disabled={stepIndex === 0 || isSubmitting}
                  >
                    <span className="text-[18px] leading-none">‹</span>
                    前の質問に戻る
                  </button>

                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-extrabold text-[#6b4a2b]">
                      ダンススクール相性診断
                    </div>

                    <div className="rounded-full bg-white px-3 py-1 text-[12px] font-extrabold text-[#6b4a2b] shadow-[0_6px_14px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
                      {stepIndex + 1}/{totalSteps}
                    </div>
                  </div>
                </div>

                {/* 進捗バー（黄色＋つまみ） */}
                <div className="relative mb-5">
                  <div className="h-[6px] w-full rounded-full bg-[#e6decf]" />
                  <div
                    className="absolute left-0 top-0 h-[6px] rounded-full bg-[#f5c400]"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, ((stepIndex + 1) / totalSteps) * 100),
                      )}%`,
                    }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2"
                    style={{
                      left: `calc(${Math.max(
                        0,
                        Math.min(100, ((stepIndex + 1) / totalSteps) * 100),
                      )}% - 8px)`,
                    }}
                  >
                    <div className="h-4 w-4 rounded-full bg-[#f5c400] shadow-[0_6px_14px_rgba(0,0,0,0.18)] ring-4 ring-[#fbf6ef]" />
                  </div>
                </div>

                {/* 質問カード */}
                <div className="rounded-[28px] bg-white px-5 py-6 shadow-[0_14px_32px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
                  {/* 見出し：Qバッジ＋タイトル */}
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#f5c400] text-[#6b4a2b] shadow-sm">
                      <div className="text-[16px] font-extrabold leading-none">
                        {String(stepIndex + 1).padStart(2, "0")}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[18px] font-extrabold leading-snug text-[#6b4a2b]">
                        {currentQuestion.title}
                      </div>

                      {currentQuestion.description && (
                        <div className="mt-3 whitespace-pre-line text-[13px] font-semibold leading-6 text-[#6b4a2b]/80">
                          {currentQuestion.description}
                        </div>
                      )}

                      {isQ1 && campusLoading && (
                        <div className="mt-2 text-[11px] font-semibold text-[#6b4a2b]/50">
                          校舎一覧を読み込み中...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 選択肢 */}
                  <div className="mt-6 space-y-3">
                    {(() => {
                      const isQ1Local = currentQuestion.id === "Q1";
                      if (isQ1Local && !campusLoaded) return null;

                      if (currentQuestion.options.length === 0) {
                        return (
                          <div className="rounded-2xl bg-[#fbf6ef] px-4 py-4 text-center text-[12px] font-semibold text-[#6b4a2b]/60">
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
                            onClick={() =>
                              handleSelectOption(currentQuestion.id, opt.id)
                            }
                            className={[
                              "w-full rounded-[16px] px-6 py-5 text-left transition-all duration-200",
                              "text-[15px] font-bold leading-relaxed",
                              "shadow-[0_4px_0_rgba(0,0,0,0.08)] active:shadow-none active:translate-y-[4px]",
                              selected
                                ? "bg-[#fcedce] text-[#6b4a2b] ring-2 ring-[#f5c400]"
                                : "bg-[#fff4cb] text-[#6b4a2b] ring-1 ring-black/5 hover:brightness-95 hover:shadow-[0_6px_0_rgba(0,0,0,0.08)] hover:-translate-y-[1px]",
                            ].join(" ")}
                          >
                            {opt.label}
                          </button>
                        );
                      });
                    })()}
                  </div>

                  {/* エラー */}
                  {error && (
                    <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-600">
                      {error}
                    </div>
                  )}

                  {/* フッター */}
                  <div className="mt-6 flex items-center justify-between">
                    <button
                      type="button"
                      className="text-[12px] font-semibold text-[#6b4a2b]/60 underline disabled:opacity-40"
                      onClick={handlePrev}
                      disabled={stepIndex === 0 || isSubmitting}
                    >
                      戻る
                    </button>

                    {stepIndex === totalSteps - 1 && (
                      <button
                        type="button"
                        className="rounded-full bg-[#f5c400] px-5 py-2 text-[12px] font-extrabold text-[#6b4a2b] shadow-[0_10px_22px_rgba(0,0,0,0.12)] disabled:opacity-40"
                        onClick={() => void handleSubmit()}
                        disabled={!canGoNext || isSubmitting}
                      >
                        {isSubmitting ? "診断中..." : "診断結果を見る"}
                      </button>
                    )}
                  </div>

                  {!schoolId && (
                    <div className="mt-3 text-[10px] font-semibold text-red-500/80">
                      ※ URLクエリ
                      param「schoolId」または「school」が指定されていません。
                      <br />
                      例：
                      <code className="rounded bg-white/60 px-1">
                        ?schoolId=links
                      </code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* ✅ ローディングオーバーレイ */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm transition-opacity duration-300">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#f5c400] border-t-transparent" />
          <div className="mt-6 text-[18px] font-bold text-[#6b4a2b] animate-pulse">
            診断中...
          </div>
        </div>
      )}
    </div>
  );
}
