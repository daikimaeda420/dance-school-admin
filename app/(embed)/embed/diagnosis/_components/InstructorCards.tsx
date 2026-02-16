"use client";

type DiagnosisInstructorVM = {
  id: string;
  label: string;
  slug: string;
  photoUrl?: string | null;
  charmTags?: string | null;
  introduction?: string | null;
};

type FallbackTeacher = {
  id?: string;
  name?: string;
  photoUrl?: string | null;
  styles: string[];
};

type Props = {
  instructors: DiagnosisInstructorVM[];
  fallbackTeacher: FallbackTeacher;
};

function splitCharmTags(input?: string | null): string[] {
  const s = String(input ?? "").trim();
  if (!s) return [];
  return s
    .split(/[,、\/|]\s*|\n+/g)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export default function InstructorCards({
  instructors,
  fallbackTeacher,
}: Props) {
  const hasInstructors = instructors.length > 0;

  return (
    <div className="space-y-2">


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
          {fallbackTeacher.photoUrl && (
            <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fallbackTeacher.photoUrl}
                alt={fallbackTeacher.name ?? "講師"}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div>
            <div className="text-sm font-semibold">
              {fallbackTeacher.name ?? "担当講師"}
            </div>
            {fallbackTeacher.styles?.length > 0 && (
              <div className="mt-1 text-xs text-gray-500">
                スタイル：{fallbackTeacher.styles.join(" / ")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
