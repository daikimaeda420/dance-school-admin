"use client";

import type { ResultCopy } from "@/lib/diagnosis/resultCopy";
import styles from "../DiagnosisEmbedClient.module.scss";

type DiagnosisResult = {
  score: number;
  pattern: "A" | "B";
  patternMessage: string | null;
  bestMatch: {
    classId?: string;
    className?: string;
    levels: string[];
    targets: string[];
  };
  selectedCourse?: {
    id: string;
    label: string;
    slug: string;
    answerTag?: string | null;
    photoUrl?: string | null;
  } | null;
  resultCopy?: {
    level?: ResultCopy | null;
    age?: ResultCopy | null;
    teacher?: ResultCopy | null;
    concern?: string | null;
  };
  concernMessage: string;
};

type Props = {
  result: DiagnosisResult;
  onClose?: () => void;
  imgSrc: string | null;
  coursePhotoUrl: string | null;
  fallbackCourseImgSrc: string | null;
  className: string;
};

export default function ResultHero({
  result,
  onClose,
  imgSrc,
  coursePhotoUrl,
  fallbackCourseImgSrc,
  className,
}: Props) {
  return (
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
  );
}
