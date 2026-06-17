import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";

export type PublicInfoSection = {
  title: string;
  description: string;
  bullets?: string[];
};

type PublicInfoPageProps = {
  title: string;
  description: string;
  sections: PublicInfoSection[];
  ctaTitle?: string;
  ctaText?: string;
  children?: ReactNode;
  showCta?: boolean;
};

const SOFT_GRADIENT =
  "radial-gradient(circle at 18% 18%, rgba(255,225,215,0.72) 0%, rgba(255,225,215,0) 34%), radial-gradient(circle at 86% 22%, rgba(255,228,238,0.78) 0%, rgba(255,228,238,0) 36%), linear-gradient(135deg, #ffffff 0%, #fff7f1 48%, #ffeef4 100%)";

export function PublicInfoPage({
  title,
  description,
  sections,
  ctaTitle = "導入の相談をする",
  ctaText = "現在の運用状況に合わせて、必要な機能と始め方を整理します。",
  children,
  showCta = true,
}: PublicInfoPageProps) {
  return (
    <main className="min-h-screen bg-white text-slate-950 selection:bg-[#fe6147]/20">
      <MarketingHeader />

      <section
        className="border-b border-pink-100 bg-[#fff8f7] px-5 py-14 sm:px-8"
        style={{ backgroundImage: SOFT_GRADIENT }}
      >
        <div className="mx-auto max-w-[1120px]">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-extrabold text-[#fe6147] hover:text-[#e94f36]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            トップへ戻る
          </Link>
          <h1 className="mt-8 max-w-[760px] text-[36px] font-extrabold leading-tight tracking-normal text-slate-950 sm:text-[48px]">
            {title}
          </h1>
          <p className="mt-5 max-w-[760px] text-base font-semibold leading-8 text-slate-700">
            {description}
          </p>
        </div>
      </section>

      {sections.length > 0 ? (
        <section className="px-5 py-12 sm:px-8">
          <div className="mx-auto grid max-w-[1120px] gap-5 md:grid-cols-3">
            {sections.map((section) => (
              <article
                key={section.title}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.06)]"
              >
                <h2 className="text-lg font-extrabold leading-7 text-slate-950">{section.title}</h2>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{section.description}</p>
                {section.bullets ? (
                  <ul className="mt-5 space-y-3">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2 text-sm font-bold leading-6 text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#fe6147]" aria-hidden="true" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {children}

      {showCta ? (
        <section className="px-5 pb-12 sm:px-8">
          <div className="mx-auto flex max-w-[1120px] flex-col gap-4 rounded-xl border border-[#ffd7cf] bg-[#fff0ec] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-950">{ctaTitle}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{ctaText}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/#cta"
                className="inline-flex min-h-[46px] items-center justify-center rounded-lg bg-[#fe6147] px-6 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(254,97,71,0.2)] transition hover:bg-[#e94f36]"
              >
                導入の相談
              </Link>
              <a
                href="mailto:rizbo@dansul.jp"
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-6 text-sm font-extrabold text-slate-950 transition hover:border-[#fe6147] hover:text-[#fe6147]"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                メールする
              </a>
            </div>
          </div>
        </section>
      ) : null}

      <MarketingFooter />
    </main>
  );
}
