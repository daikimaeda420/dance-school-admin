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
  onCtaClick,
}: Props & { onCtaClick?: () => void }) {
  return (
    <div className="relative">
      {/* カード本体 */}
      <div className="relative z-10 overflow-hidden rounded-[32px] bg-white pb-10 pt-8 text-center shadow-lg">
        {onClose && (
          <button
            type="button"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
            onClick={onClose}
            aria-label="閉じる"
          >
            ✕
          </button>
        )}

        {/* ラベル */}
        <div className="mx-auto inline-block rounded-full bg-[#d0c2ad] px-6 py-1.5 text-[11px] font-bold text-white shadow-sm">
          今のあなたに1番おすすめのクラスは…
        </div>

        {/* キャッチコピー */}
        <div className="mt-4 text-[22px] font-black text-[#e83e3e] drop-shadow-sm">
          相性バツグン！
        </div>

        {/* マッチング度（円グラフ） */}
        <div className="relative mx-auto mt-4 h-[160px] w-[160px]">
          {/* 装飾（紙吹雪的なドット） */}
          <div className="absolute -left-8 top-0 text-[#f5c400] text-xl">✦</div>
          <div className="absolute -right-4 top-8 text-[#ff8e8e] text-lg">●</div>
          <div className="absolute bottom-0 -left-4 text-[#8ec8ff] text-xl">★</div>
          
          <div
            className="relative grid h-full w-full place-items-center rounded-full shadow-[0_4px_20px_rgba(240,141,107,0.3)]"
            style={{
              background: `conic-gradient(#f7a58c ${result.score}%, #fdece8 0)`,
            }}
          >
            <div className="grid h-[136px] w-[136px] place-items-center rounded-full bg-white shadow-inner">
              <div className="text-center">
                <div className="text-[11px] font-bold text-[#b59e88] tracking-widest">
                  マッチング度
                </div>
                <div className="text-[44px] font-black leading-none text-[#6b4a2b] tracking-tighter">
                  {result.score}
                  <span className="text-[20px] font-bold ml-0.5">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* クラス名エリア */}
        <div className="mt-5">
          <div className="text-[15px] font-bold text-[#6b4a2b]">
            運命のクラスかも？
          </div>
          <div className="mt-1 px-4 text-[26px] font-black leading-tight text-[#f28c68]">
            {result.bestMatch?.className ?? "K-POP 初級クラス"}
          </div>
          {result.patternMessage && (
            <div className="mt-2 text-xs font-medium text-gray-400">
              {result.patternMessage}
            </div>
          )}
        </div>

        {/* スタンプ風装飾（例） */}
        {/* <div className="absolute right-4 top-20 opacity-20 rotate-12 pointer-events-none">
          <div className="border-4 border-red-500 rounded-full w-16 h-16" />
        </div> */}

        {/* ボタン */}
        <div className="mt-8 px-6">
          <button
            type="button"
            onClick={onCtaClick}
            className="w-full rounded-full bg-[#f5c400] py-4 text-[18px] font-bold text-[#6b4a2b] shadow-[0_4px_0_#d9ad00] active:translate-y-[2px] active:shadow-none transition-all hover:brightness-105"
          >
            お申し込みはこちら
          </button>
        </div>
      </div>
      
      {/* 下部のV字装飾（擬似要素の代わり） */}
      <div className="absolute -bottom-4 left-1/2 h-8 w-8 -translate-x-1/2 rotate-45 bg-white shadow-lg z-0 rounded-sm" />
    </div>
  );
}
