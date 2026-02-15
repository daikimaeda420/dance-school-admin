"use client";

type Props = {
  courseName?: string;
  description?: string | null;
};

export default function ClassIntroduction({ courseName, description }: Props) {
  if (!courseName) return null;

  return (
    <div className="rounded-[32px] border border-[#EFE7DB] bg-[#FCFBF9] px-5 py-8 text-center shadow-sm">
      {/* 見出し */}
      <div className="text-center">
        <h2 className="text-[22px] font-extrabold tracking-wide text-[#7A4C1F]">
          クラスの紹介
        </h2>
        <div className="mt-1 text-[12px] font-bold tracking-[0.22em] text-[#7A4C1F]/80">
          CLASS
        </div>
        <div className="mx-auto mt-4 h-px w-full bg-white/30" />
      </div>

      {/* 吹き出し */}
      <div className="relative mt-7 inline-block">
        <div className="relative z-10 rounded-full bg-white px-6 py-2 shadow-sm">
          <span className="text-[13px] font-bold text-[#7A4C1F]">
            周りの9割が未経験スタート
          </span>
        </div>
        <div className="absolute left-1/2 top-full -mt-2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white" />
      </div>

      {/* コース名 */}
      <div className="mt-4 text-[28px] font-extrabold text-[#F29600] drop-shadow-sm">
        {courseName}
      </div>

      {/* 説明文 */}
      <div className="mt-5 text-left">
        <p className="whitespace-pre-wrap text-[14px] font-semibold leading-7 text-[#5e4A35]">
          {description ||
            "このクラスは初心者向けに設計されています。基礎からゆっくりと進めるので、ダンスが初めての方でも安心して参加いただけます。"}
        </p>
      </div>
    </div>
  );
}
