"use client";

import type { ReactNode } from "react";

// ===== ReviewCard =====
function CornerMarks() {
  const c = "rgba(122,75,31,0.35)";
  return (
    <>
      <span className="pointer-events-none absolute left-4 top-4">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M16 2H2v14" stroke={c} strokeWidth="3" />
        </svg>
      </span>
      <span className="pointer-events-none absolute bottom-4 right-4">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M2 16h14V2" stroke={c} strokeWidth="3" />
        </svg>
      </span>
    </>
  );
}

function ReviewCard(props: {
  title: string[];
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
      <div
        className={[
          "absolute -bottom-[10px] h-5 w-5 rotate-45",
          bubbleBg,
          border,
          align === "left" ? "left-7" : "right-7",
        ].join(" ")}
      />
      <CornerMarks />
      <div className="text-center text-[#7a4b1f]">
        <div className="text-[18px] font-extrabold leading-snug">
          {props.title[0]}
          <br />
          {props.title[1]}
        </div>
      </div>
      <p className="mt-4 text-[14px] leading-7 text-[#7a4b1f]/90">
        {props.body}
      </p>
      <div className="mt-4 h-px w-full bg-black/10" />
      <div className="mt-3 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f5c400]">
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

// ===== StepItem =====
function StepItem(props: { step: number; text: ReactNode }) {
  return (
    <div className="relative pl-[56px]">
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
      <div className="text-[14px] font-semibold leading-7 text-[#7a4b1f]/90">
        {props.text}
      </div>
      <div className="mt-4 rounded-[18px] bg-[#d9d9d9] h-[132px]" />
      <div className="relative mt-3">
        <div className="mx-auto h-px w-full bg-black/10" />
        <div className="mx-auto -mt-[1px] w-0 h-0 border-l-[12px] border-r-[12px] border-t-[10px] border-l-transparent border-r-transparent border-t-[#d9d9d9]" />
      </div>
    </div>
  );
}

// ===== pickCampusMapFields =====
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

function pickCampusMapFields(c: any): { embedSrc: string; linkUrl: string } {
  const embedRaw =
    c?.googleMapEmbedUrl ?? c?.mapEmbedUrl ?? c?.google_map_embed_url ?? null;
  const linkRaw = c?.googleMapUrl ?? c?.mapLinkUrl ?? c?.google_map_url ?? null;
  const embedSrc = normalizeEmbedInput(embedRaw);
  const linkUrl = String(linkRaw ?? "").trim();
  return { embedSrc, linkUrl };
}

// ===== Types =====
type CampusInfo = {
  label: string;
  slug: string;
  address?: string | null;
  access?: string | null;
  googleMapUrl?: string | null;
  googleMapEmbedUrl?: string | null;
  mapLinkUrl?: string | null;
  mapEmbedUrl?: string | null;
};

type FaqItem = {
  q: string;
  a: string;
};

type Props = {
  campus: CampusInfo | null | undefined;
  faqs: FaqItem[];
  openIndex: number | null;
  onToggleFaq: (i: number) => void;
};

// ===== Main Component =====
export default function ResultSections({
  campus,
  faqs,
  openIndex,
  onToggleFaq,
}: Props) {
  return (
    <>
      {/* ✅ レッスン料金 */}
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
            <div className="text-[13px] font-bold text-[#7a4b1f]">入会金</div>
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
          {["XXXXコース", "XXXXコース", "XXXXコース"].map((course, i) => (
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
          ))}
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

      {/* ✅ 生徒の声 */}
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
        if (!campus) return null;
        const { embedSrc, linkUrl } = pickCampusMapFields(campus);

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
              {campus.label}
            </div>

            <div className="mt-3 space-y-3 text-[14px] font-semibold text-[#7A4C1F]/85">
              {campus.address && (
                <div className="whitespace-pre-wrap border-t border-[#EFE7DB] pt-3">
                  {campus.address}
                </div>
              )}
              {campus.access && (
                <div className="border-t border-[#EFE7DB] pt-3">
                  <div className="font-extrabold text-[#7A4C1F]">
                    【電車でお越しの場合】
                  </div>
                  <div className="mt-1 whitespace-pre-wrap">{campus.access}</div>
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

      {/* 体験レッスンの流れ */}
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

      {/* FAQ */}
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
                  onClick={() => onToggleFaq(i)}
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
    </>
  );
}
