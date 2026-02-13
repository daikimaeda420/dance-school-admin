"use client";

import type { ResultCopy } from "@/lib/diagnosis/resultCopy";

type Props = {
  resultCopy?: {
    level?: ResultCopy | null;
    age?: ResultCopy | null;
    teacher?: ResultCopy | null;
    concern?: string | null;
  };
  concernMessage: string;
};

function PointCard({
  num,
  bgColor,
  title,
  body,
}: {
  num: number;
  bgColor: string;
  title: string;
  body: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_25px_rgba(0,0,0,0.12)]">
      <div className={`flex items-center gap-3 ${bgColor} px-4 py-3`}>
        <div className="text-center text-[#7a4b1f]">
          <div className="text-[10px] font-extrabold">POINT</div>
          <div className="text-[26px] font-extrabold leading-none">{num}</div>
        </div>
        <div className="text-sm font-extrabold text-[#7a4b1f]">{title}</div>
      </div>
      <div className="px-4 py-4 text-sm leading-7 text-[#7a4b1f]/90">
        {body}
      </div>
    </div>
  );
}

export default function ReasonCards({ resultCopy, concernMessage }: Props) {
  return (
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
        {resultCopy?.level && (
          <PointCard
            num={1}
            bgColor="bg-[#fde4d8]"
            title={resultCopy.level.title}
            body={resultCopy.level.body}
          />
        )}

        {resultCopy?.age && (
          <PointCard
            num={2}
            bgColor="bg-[#fbd6e6]"
            title={resultCopy.age.title}
            body={resultCopy.age.body}
          />
        )}

        {resultCopy?.teacher && (
          <PointCard
            num={3}
            bgColor="bg-[#d9efb8]"
            title={resultCopy.teacher.title}
            body={resultCopy.teacher.body}
          />
        )}
      </div>

      <div className="mt-6 rounded-2xl bg-[#f7f3ea] px-4 py-5 text-center">
        <div className="mb-2 flex items-center justify-center gap-2 text-[#7a4b1f]">
          <span className="text-xl">💬</span>
          <span className="text-sm font-extrabold tracking-wide">COMMENT</span>
        </div>
        <div className="text-sm leading-7 text-[#7a4b1f]/90 whitespace-pre-wrap">
          {resultCopy?.concern ?? concernMessage}
        </div>
      </div>
    </div>
  );
}
