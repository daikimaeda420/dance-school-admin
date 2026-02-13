// app/(embed)/embed/diagnosis/DiagnosisEmbedClient.tsx
"use client";

import styles from "./DiagnosisEmbedClient.module.scss";
import type { ResultCopy } from "@/lib/diagnosis/resultCopy";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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
    photoUrl?: string | null;
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

  // 既存：親から渡せる場合は優先する
  campusOptions?: DiagnosisQuestionOption[];
  courseOptions?: DiagnosisQuestionOption[];

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

/** ===== 「生徒の声」内部コンポーネント（同ファイル内） ===== */
function ReviewCard(props: {
  title: string[]; // 2行想定
  body: string;
  meta: string;
  align?: "left" | "right";
}) {
  const align = props.align ?? "left";
  const bubbleBg = "bg-[#f6efe6]";
  const border = "border border-black/10";

  return (
    <div
      className={[
        "relative rounded-[22px] px-5 pt-6 pb-4",
        bubbleBg,
        border,
        "shadow-[0_8px_20px_rgba(0,0,0,0.06)]",
      ].join(" ")}
    >
      {/* 吹き出しのしっぽ */}
      <div
        className={[
          "absolute -bottom-[10px] h-5 w-5 rotate-45",
          bubbleBg,
          border,
          align === "left" ? "left-7" : "right-7",
        ].join(" ")}
      />

      {/* 角の装飾（左上・右下） */}
      <CornerMarks />

      {/* タイトル */}
      <div className="text-center text-[#7a4b1f]">
        <div className="text-[18px] font-extrabold leading-snug">
          {props.title[0]}
          <br />
          {props.title[1]}
        </div>
      </div>

      {/* 本文 */}
      <p className="mt-4 text-[14px] leading-7 text-[#7a4b1f]/90">
        {props.body}
      </p>

      <div className="mt-4 h-px w-full bg-black/10" />

      {/* メタ */}
      <div className="mt-3 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f5c400]">
          {/* 顔アイコン */}
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.35)" />
            <circle cx="9" cy="10" r="1.2" fill="rgba(0,0,0,0.45)" />
            <circle cx="15" cy="10" r="1.2" fill="rgba(0,0,0,0.45)" />
            <path
              d="M8.5 14.2c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8"
              stroke="rgba(0,0,0,0.45)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="text-[13px] font-bold text-[#7a4b1f]/80">
          {props.meta}
        </div>
      </div>
    </div>
  );
}

function CornerMarks() {
  const c = "rgba(122,75,31,0.35)";
  return (
    <>
      {/* left-top */}
      <span className="pointer-events-none absolute left-4 top-4">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M16 2H2v14" stroke={c} strokeWidth="3" />
        </svg>
      </span>
      {/* right-bottom */}
      <span className="pointer-events-none absolute bottom-4 right-4">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M2 16h14V2" stroke={c} strokeWidth="3" />
        </svg>
      </span>
    </>
  );
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
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "ダンスに興味がありますがダンス初心者でリズム感もありません。レッスンについていけるか心配です。",
      a: "リンクスはダンス初心者さんの為のダンススクールですのでご安心ください。\nリンクスのクラスはアットホームで、講師が優しくレクチャーいたしますので是非体験レッスンにお越しくださいませ。",
    },
    {
      q: "40代の主婦です。年齢的に周りの生徒さんについていけるか心配です。年齢層はどのような感じでしょうか。",
      a: "リンクスでは、クラスによりますが20代〜60代の方まで幅広く、男女比は男性4割、女性6割(目安)の方がレッスンに参加されております。",
    },
    {
      q: "ダンスレッスンに初めて参加します。何が必要ですか？",
      a: "ダンスレッスンでは特別な道具は必要ございません。①動きやすい服 or 着替え ②汗拭きタオル ③お飲物(蓋の閉まるもの) ④動きやすい室内用シューズ 以上4点をご用意ください。\nまた、クラスやジャンルによってはシューズが不要な場合もございます。",
    },
    {
      q: "入会するのは月初めではないとダメでしょうか。月の途中で入会はできますか？",
      a: "可能でございます。月の途中で入会される場合は、週割りのお月謝をお支払いただきます。",
    },
    {
      q: "支払い方法は何が利用できますか？",
      a: "初回金(入会金)はお振込み、お月謝はクレジットカードがご利用いただけます。\n体験料はクレジットカード前払いでお支払いいただきます。(会員登録不要)",
    },
  ];

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
    "ALL" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN"
  >("ALL");

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

  // ✅ Q1のみ管理画面連動、Q2〜Q6は固定
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
    (["Q1", "Q2", "Q3", "Q4", "Q5"] as DiagnosisQuestionId[]).forEach(
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

  /** ===== 内部コンポーネント（同ファイル内） ===== */
  function StepItem(props: { step: number; text: ReactNode }) {
    return (
      <div className="relative pl-[56px]">
        {/* STEP丸 */}
        <div className="absolute left-[4px] top-[2px]">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f5c400] shadow-sm">
            <div className="text-center leading-none text-[#7a4b1f]">
              <div className="text-[10px] font-extrabold tracking-wide">
                STEP
              </div>
              <div className="text-[16px] font-extrabold">{props.step}</div>
            </div>
          </div>
        </div>

        {/* 文章 */}
        <div className="text-[14px] font-semibold leading-7 text-[#7a4b1f]/90">
          {props.text}
        </div>

        {/* 画像プレースホルダー */}
        <div className="mt-4 rounded-[18px] bg-[#d9d9d9] h-[132px]" />

        {/* 下の三角 */}
        <div className="relative mt-3">
          <div className="mx-auto h-px w-full bg-black/10" />
          <div className="mx-auto -mt-[1px] w-0 h-0 border-l-[12px] border-r-[12px] border-t-[10px] border-l-transparent border-r-transparent border-t-[#d9d9d9]" />
        </div>
      </div>
    );
  }

  // ==========================
  // ✅ 結果画面で使う派生値（常に定義してスコープ崩壊を防ぐ）
  // ==========================
  const instructors = result?.instructors ?? [];
  const hasInstructors = instructors.length > 0;

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

  // ✅ DiagnosisForm 用 option 生成（常に定義）
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

    const list =
      scheduleDay === "ALL"
        ? dayOrder.flatMap((d) =>
            (schedule[d] ?? []).map((s) => ({ ...s, weekday: d })),
          )
        : (schedule[scheduleDay] ?? []).map((s) => ({
            ...s,
            weekday: scheduleDay as DayKey,
          }));

    return list.map((s) => ({
      value: s.id,
      label: `${dayLabel[s.weekday as DayKey]} ${s.timeText} ${s.genreText}`,
    }));
  }, [schedule, scheduleDay]);

  const dateOptions = useMemo(() => {
    const want = scheduleDay === "ALL" ? 14 : 12;

    const targetDow =
      scheduleDay === "ALL"
        ? null
        : scheduleDay === "MON"
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
              <div className="relative overflow-hidden rounded-2xl bg-[#fbf4df] px-4 pb-5 pt-4 shadow-sm ring-1 ring-black/5">
                {onClose && (
                  <button
                    type="button"
                    className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/80 text-xs text-gray-500 ring-1 ring-black/5 hover:bg-white"
                    onClick={onClose}
                    aria-label="閉じる"
                  >
                    ✕
                  </button>
                )}

                <div className="mx-auto inline-flex rounded-full bg-[#cfc1aa] px-4 py-2 text-xs font-bold text-white">
                  今のあなたに1番おすすめのクラスは…
                </div>

                <div className="mt-3 text-center text-[18px] font-extrabold text-red-600">
                  相性バツグン！
                </div>

                {/* 円形メーター */}
                <div className="mt-3 flex justify-center">
                  <div
                    className="relative grid h-[132px] w-[132px] place-items-center rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.15)]"
                    style={{
                      background: `conic-gradient(#f3a58c ${Math.max(
                        0,
                        Math.min(100, result.score),
                      )}%, rgba(243,165,140,0.25) 0)`,
                    }}
                    aria-label={`マッチング度 ${result.score}%`}
                  >
                    <div className="grid h-[108px] w-[108px] place-items-center rounded-full bg-white">
                      <div className="text-center">
                        <div className="text-[12px] font-bold text-gray-500">
                          マッチング度
                        </div>
                        <div className="mt-1 text-[34px] font-extrabold text-[#7a4b1f] leading-none">
                          {result.score}
                          <span className="text-[16px] font-extrabold align-top">
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="pointer-events-none absolute inset-0 rounded-full ring-8 ring-white/40" />
                  </div>
                </div>

                {/* 下の白い帯 */}
                <div className="mt-4 rounded-2xl bg-white px-4 py-5 text-center shadow-[0_10px_25px_rgba(0,0,0,0.08)]">
                  <div className="text-[16px] font-extrabold text-[#7a4b1f]">
                    運命のクラスかも？
                  </div>
                  <div className="mt-1 text-[30px] font-extrabold leading-tight text-[#f08d6b]">
                    {result.bestMatch?.className ?? "K-POP 初級クラス"}
                  </div>

                  {result.patternMessage && (
                    <div className="mt-2 text-xs font-medium text-gray-500">
                      {result.patternMessage}
                    </div>
                  )}
                </div>

                {imgSrc && (
                  <div
                    className={[
                      "mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white",
                      styles.mediaFrame,
                    ].join(" ")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgSrc}
                      alt={
                        imgSrc === coursePhotoUrl || imgSrc === fallbackCourseImgSrc
                          ? `${className}の画像`
                          : "診断結果画像"
                      }
                      className="h-40 w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>

              {/* メイン提案エリア */}
              <div className="rounded-2xl bg-[#fff7dc] px-4 pb-6 pt-6 shadow-sm ring-1 ring-black/5">
                <div className="text-center">
                  <div className="text-[22px] font-extrabold text-[#7a4b1f]">
                    あなたに
                    <br />
                    おすすめの理由
                  </div>
                  <div className="mt-1 text-xs font-semibold tracking-[0.25em] text-[#7a4b1f]/70">
                    REASONS TO CHOOSE
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {result.resultCopy?.level && (
                    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_25px_rgba(0,0,0,0.12)]">
                      <div className="flex items-center gap-3 bg-[#fde4d8] px-4 py-3">
                        <div className="text-center text-[#7a4b1f]">
                          <div className="text-[10px] font-extrabold">
                            POINT
                          </div>
                          <div className="text-[26px] font-extrabold leading-none">
                            1
                          </div>
                        </div>
                        <div className="text-sm font-extrabold text-[#7a4b1f]">
                          {result.resultCopy.level.title}
                        </div>
                      </div>
                      <div className="px-4 py-4 text-sm leading-7 text-[#7a4b1f]/90">
                        {result.resultCopy.level.body}
                      </div>
                    </div>
                  )}

                  {result.resultCopy?.age && (
                    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_25px_rgba(0,0,0,0.12)]">
                      <div className="flex items-center gap-3 bg-[#fbd6e6] px-4 py-3">
                        <div className="text-center text-[#7a4b1f]">
                          <div className="text-[10px] font-extrabold">
                            POINT
                          </div>
                          <div className="text-[26px] font-extrabold leading-none">
                            2
                          </div>
                        </div>
                        <div className="text-sm font-extrabold text-[#7a4b1f]">
                          {result.resultCopy.age.title}
                        </div>
                      </div>
                      <div className="px-4 py-4 text-sm leading-7 text-[#7a4b1f]/90">
                        {result.resultCopy.age.body}
                      </div>
                    </div>
                  )}

                  {result.resultCopy?.teacher && (
                    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_25px_rgba(0,0,0,0.12)]">
                      <div className="flex items-center gap-3 bg-[#d9efb8] px-4 py-3">
                        <div className="text-center text-[#7a4b1f]">
                          <div className="text-[10px] font-extrabold">
                            POINT
                          </div>
                          <div className="text-[26px] font-extrabold leading-none">
                            3
                          </div>
                        </div>
                        <div className="text-sm font-extrabold text-[#7a4b1f]">
                          {result.resultCopy.teacher.title}
                        </div>
                      </div>
                      <div className="px-4 py-4 text-sm leading-7 text-[#7a4b1f]/90">
                        {result.resultCopy.teacher.body}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 rounded-2xl bg-[#f7f3ea] px-4 py-5 text-center">
                  <div className="mb-2 flex items-center justify-center gap-2 text-[#7a4b1f]">
                    <span className="text-xl">💬</span>
                    <span className="text-sm font-extrabold tracking-wide">
                      COMMENT
                    </span>
                  </div>
                  <div className="text-sm leading-7 text-[#7a4b1f]/90 whitespace-pre-wrap">
                    {result.resultCopy?.concern ?? result.concernMessage}
                  </div>
                </div>
              </div>

              {/* ✅ 担当講師 */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500">
                  担当講師
                </div>

                {hasInstructors ? (
                  <div className="space-y-3">
                    {instructors.map((t) => {
                      const tags = splitCharmTags(t.charmTags);
                      const intro = String(t.introduction ?? "").trim();

                      return (
                        <div
                          key={t.id}
                          className="rounded-[32px] border border-[#EFE7DB] bg-white px-5 py-6 shadow-sm"
                        >
                          {/* 見出し */}
                          <div className="text-center">
                            <div className="text-[22px] font-extrabold tracking-wide text-[#7A4C1F]">
                              担当講師の紹介
                            </div>
                            <div className="mt-1 text-[12px] font-bold tracking-[0.22em] text-[#7A4C1F]/80">
                              INSTRUCTOR
                            </div>
                            <div className="mx-auto mt-4 h-px w-full bg-[#EFE7DB]" />
                          </div>

                          {/* 講師情報 */}
                          <div className="mt-6 flex items-center gap-4">
                            <div className="h-20 w-20 overflow-hidden rounded-full bg-gray-200">
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

                            <div className="min-w-0">
                              <div className="mt-1 flex items-baseline gap-2">
                                <div className="truncate text-[28px] font-extrabold tracking-tight text-[#7A4C1F]">
                                  {t.label}
                                </div>
                                <div className="text-[14px] font-bold text-[#7A4C1F]/80">
                                  先生
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* タグ */}
                          {tags.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {tags.map((tag, idx) => (
                                <span
                                  key={`${t.id}_tag_${idx}`}
                                  className="inline-flex items-center rounded-full bg-[#8E8E8E] px-3 py-1 text-[11px] font-bold text-white"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* コメント */}
                          {intro && (
                            <div className="mt-5 rounded-[28px] border-2 border-[#C9B091] bg-white px-5 py-6">
                              <div className="flex flex-col items-center text-center">
                                <svg
                                  width="34"
                                  height="34"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  aria-hidden="true"
                                  className="mb-3"
                                >
                                  <path
                                    d="M7 8h10M7 12h7m-2 7l-3.5-2H6a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4h-2.5L12 19z"
                                    stroke="#7A4C1F"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>

                                <div className="text-[18px] font-extrabold text-[#7A4C1F]">
                                  先生からのコメント
                                </div>

                                <div className="mt-3 whitespace-pre-wrap text-[14px] font-semibold leading-7 text-[#7A4C1F]/85">
                                  {intro}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
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

              {/* ✅ スケジュール（背景を白に） */}
              <div className="rounded-[28px] bg-white px-5 py-6 shadow-sm ring-1 ring-black/5">
                <div className="text-center">
                  <div className="text-[26px] font-extrabold tracking-wide text-[#6b4a2b]">
                    スケジュール
                  </div>
                  <div className="mt-1 text-[12px] font-semibold tracking-[0.2em] text-[#6b4a2b]/70">
                    SCHEDULE
                  </div>
                  <div className="mx-auto mt-6 h-px w-full bg-[#6b4a2b]/10" />
                </div>

                {scheduleError && (
                  <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[11px] text-red-600">
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
                      <div className="mt-4 rounded-2xl bg-white p-5 text-center text-[12px] font-semibold text-[#6b4a2b]/70 ring-1 ring-[#6b4a2b]/10">
                        現在、該当するスケジュールはありません。
                      </div>
                    );
                  }

                  const dayKeys = [
                    "ALL",
                    "MON",
                    "TUE",
                    "WED",
                    "THU",
                    "FRI",
                    "SAT",
                    "SUN",
                  ] as const;
                  type ViewDayKey = (typeof dayKeys)[number];

                  const viewDayLabel: Record<ViewDayKey, string> = {
                    ALL: "ALL",
                    MON: "月",
                    TUE: "火",
                    WED: "水",
                    THU: "木",
                    FRI: "金",
                    SAT: "土",
                    SUN: "日",
                  };

                  const activeDay: ViewDayKey = scheduleDay;
                  const setActiveDay: (d: ViewDayKey) => void = setScheduleDay;

                  const list =
                    activeDay === "ALL"
                      ? (
                          [
                            "MON",
                            "TUE",
                            "WED",
                            "THU",
                            "FRI",
                            "SAT",
                            "SUN",
                          ] as const
                        ).flatMap((k) =>
                          (s[k] ?? []).map((slot) => ({ ...slot, weekday: k })),
                        )
                      : (s[activeDay] ?? []).map((slot) => ({
                          ...slot,
                          weekday: activeDay,
                        }));

                  return (
                    <>
                      <div className="mt-6 flex flex-wrap gap-3">
                        {dayKeys.map((k) => (
                          <button
                            key={k}
                            onClick={() => setActiveDay(k)}
                            className={[
                              "h-11 min-w-[72px] rounded-full px-5 text-[14px] font-bold",
                              "transition active:scale-[0.99]",
                              "shadow-[0_8px_16px_rgba(0,0,0,0.08)]",
                              k === activeDay
                                ? "bg-[#f6c400] text-[#6b4a2b]"
                                : "bg-white text-[#6b4a2b] ring-1 ring-[#6b4a2b]/10",
                            ].join(" ")}
                          >
                            {viewDayLabel[k]}
                          </button>
                        ))}
                      </div>

                      <div className="mt-6 space-y-4">
                        {list.length === 0 ? (
                          <div className="rounded-2xl bg-white p-5 text-center text-[12px] font-semibold text-[#6b4a2b]/70 ring-1 ring-[#6b4a2b]/10">
                            該当するスケジュールがありません
                          </div>
                        ) : (
                          list.map((slot) => (
                            <div
                              key={slot.id}
                              className={[
                                "rounded-2xl bg-white p-5",
                                "ring-1 ring-[#6b4a2b]/10",
                                "shadow-[0_10px_24px_rgba(0,0,0,0.08)]",
                              ].join(" ")}
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-1 h-5 w-1.5 rounded-full bg-[#d9d2c7]" />

                                <div className="min-w-0 flex-1">
                                  <div className="text-[18px] font-extrabold text-[#6b4a2b]">
                                    XXXXXコース
                                  </div>

                                  <div className="mt-3 space-y-2 text-[14px] font-semibold text-[#6b4a2b]/85">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[#b8a99a]">✦</span>
                                      <span className="truncate">
                                        {slot.genreText}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="text-[#b8a99a]">🕒</span>
                                      <span className="truncate">
                                        {slot.timeText}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="text-[#b8a99a]">👤</span>
                                      <span className="truncate">
                                        {slot.teacher}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="text-[#b8a99a]">📍</span>
                                      <span className="truncate">
                                        {slot.place}
                                      </span>
                                    </div>
                                  </div>

                                  {activeDay === "ALL" && (
                                    <div className="mt-3 text-[11px] font-bold text-[#6b4a2b]/55">
                                      {viewDayLabel[slot.weekday as ViewDayKey]}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* ✅ レッスン料金（max-w-md撤廃） */}
              <section className="rounded-[28px] bg-white px-5 py-6 shadow-sm ring-1 ring-black/5">
                <div className="text-center">
                  <h2 className="text-[22px] font-extrabold tracking-wide text-[#7a4b1f]">
                    レッスン料金
                  </h2>
                  <div className="mt-1 text-[12px] font-semibold tracking-[0.25em] text-[#7a4b1f]/70">
                    PRICE
                  </div>
                </div>

                <div className="my-5 h-px w-full bg-black/10" />

                <div className="text-center text-[16px] font-bold text-[#7a4b1f]">
                  体験レッスン・入会金
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[18px] border border-black/15 bg-white px-4 py-4 text-center">
                    <div className="text-[13px] font-bold text-[#7a4b1f]">
                      体験レッスン
                    </div>
                    <div className="mt-2 text-[28px] font-extrabold text-[#7a4b1f]">
                      ¥0
                    </div>
                    <div className="mt-1 text-[12px] font-bold text-[#7a4b1f]/80">
                      /月（税込）
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-black/15 bg-white px-4 py-4 text-center">
                    <div className="text-[13px] font-bold text-[#7a4b1f]">
                      入会金
                    </div>
                    <div className="mt-2 text-[28px] font-extrabold text-[#7a4b1f]">
                      ¥8,800
                    </div>
                    <div className="mt-1 text-[12px] font-bold text-[#7a4b1f]/80">
                      /月（税込）
                    </div>
                  </div>
                </div>

                <div className="mt-7 text-center text-[16px] font-bold text-[#7a4b1f]">
                  コース月謝
                </div>

                <div className="mt-4 space-y-3">
                  {["XXXXコース", "XXXXコース", "XXXXコース"].map(
                    (course, i) => (
                      <div
                        key={i}
                        className="rounded-[18px] border border-black/15 bg-white px-4 py-4 text-center"
                      >
                        <div className="text-[13px] font-bold text-[#7a4b1f]">
                          {course}
                        </div>

                        <div className="mt-2 flex items-end justify-center gap-1">
                          <div className="text-[34px] font-extrabold text-[#7a4b1f]">
                            ¥2,800
                          </div>
                          <div className="pb-[6px] text-[12px] font-bold text-[#7a4b1f]/80">
                            /月（税込）
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>

                <div className="mt-5">
                  <div className="rounded-[26px] bg-[#d9d9d9] px-6 py-10 text-center shadow-[0_12px_24px_rgba(0,0,0,0.12)]">
                    <div className="text-[22px] font-extrabold leading-tight text-white">
                      キャンペーン
                      <br />
                      実施中！
                    </div>
                  </div>
                </div>
              </section>

              {/* ✅ 生徒の声（max-w-md撤廃） */}
              <section className="rounded-[28px] bg-white px-5 py-6 shadow-sm ring-1 ring-black/5">
                <div className="text-center">
                  <h2 className="text-[22px] font-extrabold tracking-wide text-[#7a4b1f]">
                    生徒の声
                  </h2>
                  <div className="mt-1 text-[12px] font-semibold tracking-[0.25em] text-[#7a4b1f]/70">
                    REVIEWS
                  </div>
                </div>

                <div className="my-5 h-px w-full bg-black/10" />

                <div className="space-y-4">
                  <ReviewCard
                    title={["初心者でも安心", "アットホームな雰囲気"]}
                    body="初心者でしたが、アットホームな雰囲気で、フォーメーションにも挑戦できてとても楽しいです♪"
                    meta="ダンススクール生徒 20代 女性"
                    align="left"
                  />
                  <ReviewCard
                    title={["雰囲気の良さが魅力", "毎回通うのが楽しみ"]}
                    body="クラスの雰囲気も良く、和気あいあいとした楽しい時間を過ごせるレッスンで、毎レッスン充実しています！"
                    meta="ダンススクール生徒 30代 女性"
                    align="right"
                  />
                  <ReviewCard
                    title={["未経験でも安心", "優しい環境で楽しい"]}
                    body="全くの初心者なので心配でしたが、先生もクラスの皆さんも優しく、すごくいい環境で最高です。"
                    meta="ダンススクール生徒 40代 男性"
                    align="left"
                  />
                </div>
              </section>

              {/* ✅ 校舎情報（ACCESS） */}
              {(() => {
                const c = result.campus ?? result.selectedCampus;
                if (!c) return null;

                const { embedSrc, linkUrl } = pickCampusMapFields(c);

                return (
                  <div className="rounded-[32px] border border-[#EFE7DB] bg-white px-5 py-6 shadow-sm">
                    <div className="text-center">
                      <div className="text-[22px] font-extrabold tracking-wide text-[#7A4C1F]">
                        アクセス
                      </div>
                      <div className="mt-1 text-[12px] font-bold tracking-[0.22em] text-[#7A4C1F]/80">
                        ACCESS
                      </div>
                      <div className="mx-auto mt-4 h-px w-full bg-[#EFE7DB]" />
                    </div>

                    {embedSrc && (
                      <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200">
                        <iframe
                          src={embedSrc}
                          className="h-56 w-full"
                          style={{ border: 0 }}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    )}

                    <div className="mt-5 text-[18px] font-extrabold text-[#7A4C1F]">
                      {c.label}
                    </div>

                    <div className="mt-3 space-y-3 text-[14px] font-semibold text-[#7A4C1F]/85">
                      {c.address && (
                        <div className="whitespace-pre-wrap border-t border-[#EFE7DB] pt-3">
                          {c.address}
                        </div>
                      )}

                      {c.access && (
                        <div className="border-t border-[#EFE7DB] pt-3">
                          <div className="font-extrabold text-[#7A4C1F]">
                            【電車でお越しの場合】
                          </div>
                          <div className="mt-1 whitespace-pre-wrap">
                            {c.access}
                          </div>
                        </div>
                      )}
                    </div>

                    {linkUrl && (
                      <div className="mt-4 border-t border-[#EFE7DB] pt-4 text-center">
                        <a
                          href={linkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[13px] font-bold text-[#7A4C1F] underline"
                        >
                          Googleマップで見る
                        </a>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 体験レッスンの流れ（max-w-md撤廃） */}
              <section className="rounded-[28px] bg-white px-5 py-6 shadow-sm ring-1 ring-black/5">
                <div className="text-center">
                  <h2 className="text-[22px] font-extrabold tracking-wide text-[#7a4b1f]">
                    体験レッスンの流れ
                  </h2>
                  <div className="mt-1 text-[12px] font-semibold tracking-[0.25em] text-[#7a4b1f]/70">
                    TRIAL LESSONS
                  </div>
                </div>

                <div className="my-5 h-px w-full bg-black/10" />

                <div className="relative">
                  <div className="absolute left-[20px] top-[18px] bottom-[18px] w-[3px] rounded-full bg-[#f5c400]" />
                  <div className="space-y-6">
                    <StepItem
                      step={1}
                      text={
                        <>
                          下記の体験レッスン申込みフォームより
                          <br />
                          ご予約ください。
                          <br />
                          必要事項を入力するのみとなる為、簡単
                          <br />
                          にお申込みいただけます。
                        </>
                      }
                    />
                    <StepItem
                      step={2}
                      text={
                        <>
                          お申込み後、スタッフより日程調整のご
                          <br />
                          連絡をいたします。
                          <br />
                          あわせて、当日の持ち物や服装、レッス
                          <br />
                          ンを行うスタジオの住所についてもご案
                          <br />
                          内しますので、初めての方でも安心で
                          <br />
                          す。
                        </>
                      }
                    />
                    <StepItem
                      step={3}
                      text={
                        <>
                          当日は、指定のスタジオへお越しいただ
                          <br />
                          き体験レッスンにご参加ください。
                          <br />
                          初心者の方にも配慮した内容で進めます
                          <br />
                          ので、ダンスが初めての方でも無理なく
                          <br />
                          お楽しみいただけます。
                        </>
                      }
                    />
                  </div>
                </div>
              </section>

              {/* FAQ（max-w-md撤廃） */}
              <section className="rounded-[28px] bg-white px-5 py-6 shadow-sm ring-1 ring-black/5">
                <div className="text-center">
                  <h2 className="text-[22px] font-extrabold tracking-wide text-[#7a4b1f]">
                    よくある質問
                  </h2>
                  <div className="mt-1 text-[12px] font-semibold tracking-[0.25em] text-[#7a4b1f]/70">
                    FAQ
                  </div>
                </div>

                <div className="my-5 h-px w-full bg-black/10" />

                <div className="space-y-3">
                  {faqs.map((item, i) => {
                    const isOpen = openIndex === i;

                    return (
                      <div
                        key={i}
                        className={[
                          "rounded-[16px] bg-white",
                          "shadow-[0_10px_22px_rgba(0,0,0,0.12)]",
                          "ring-1 ring-black/10",
                          "overflow-hidden",
                        ].join(" ")}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenIndex(isOpen ? null : i)}
                          className="w-full px-4 py-4 flex items-center gap-3 text-left"
                        >
                          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#f5c400] text-[#7a4b1f] font-extrabold">
                            Q
                          </div>

                          <div className="flex-1">
                            <div className="text-[14px] font-bold text-[#7a4b1f]">
                              {item.q}
                            </div>
                          </div>

                          <div className="ml-2 flex h-9 w-9 items-center justify-center">
                            <span className="text-[22px] font-extrabold text-[#f5c400] leading-none">
                              {isOpen ? "−" : "+"}
                            </span>
                          </div>
                        </button>

                        {isOpen && (
                          <div className="px-4 pb-4">
                            <div className="h-px w-full bg-black/10" />
                            <div className="mt-4 flex items-start gap-3">
                              <div className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#f5c400] text-[#7a4b1f] font-extrabold">
                                A
                              </div>

                              <p className="flex-1 whitespace-pre-line text-[14px] leading-7 text-[#7a4b1f]/90">
                                {item.a}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* CTA */}
              <div className="flex flex-col gap-2">
                <a
                  href={
                    result.bestMatch.classId
                      ? `/reserve?classId=${encodeURIComponent(
                          result.bestMatch.classId,
                        )}`
                      : "/reserve"
                  }
                  className={[
                    "flex items-center justify-center bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700",
                    "rounded-full",
                    styles.ctaPrimary,
                  ].join(" ")}
                >
                  このクラスの体験レッスンを予約する
                </a>
              </div>

              {/* ✅ 診断結果フォーム（ここ1回だけ） */}
              {diagnosisForm && (
                <div>
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
            <div className="min-h-[100svh] w-full bg-[#fbf6ef] px-4 py-6">
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
                              "w-full rounded-[18px] px-5 py-5 text-left",
                              "text-[14px] font-extrabold leading-6",
                              "transition active:scale-[0.99]",
                              selected
                                ? "bg-[#fff2b8] text-[#6b4a2b] ring-2 ring-[#f5c400] shadow-[0_10px_22px_rgba(0,0,0,0.10)]"
                                : "bg-[#f6f1e9] text-[#6b4a2b]/85 ring-1 ring-black/5 hover:bg-[#f3ede3]",
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

                  {/* フッター（画像は戻るだけに近いので、ボタン類は最小限） */}
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
    </div>
  );
}
