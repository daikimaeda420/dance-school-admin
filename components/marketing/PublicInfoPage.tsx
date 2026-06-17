import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, CheckCircle2, Mail } from "lucide-react";

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

const FOOTER_COLUMNS = [
  {
    title: "プロダクト",
    links: [
      { label: "機能一覧", href: "/features" },
      { label: "はじめ方", href: "/getting-started" },
      { label: "運用レポート", href: "/reports" },
    ],
  },
  {
    title: "サポート",
    links: [
      { label: "ヘルプセンター", href: "/support" },
      { label: "お問い合わせ", href: "/contact" },
      { label: "利用規約", href: "/terms" },
    ],
  },
  {
    title: "会社情報",
    links: [
      { label: "運営会社", href: "https://dansul.jp/", external: true },
      { label: "プライバシーポリシー", href: "/privacy" },
    ],
  },
];

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
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link href="/" className="flex items-center">
            <img src="/logo.svg" alt="rizbo" width={94} height={30} className="h-8 w-auto" />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-extrabold text-slate-800 md:flex">
            <Link href="/features" className="hover:text-[#fe6147]">
              機能
            </Link>
            <Link href="/getting-started" className="hover:text-[#fe6147]">
              はじめ方
            </Link>
            <Link href="/reports" className="hover:text-[#fe6147]">
              運用レポート
            </Link>
          </nav>
          <Link
            href="/#cta"
            className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-[#fe6147] px-5 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(254,97,71,0.2)] transition hover:bg-[#e94f36]"
          >
            導入の相談
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

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

      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto grid max-w-[1280px] gap-8 px-5 text-sm sm:px-8 md:grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr_1.1fr]">
          <div>
            <img src="/logo.svg" alt="rizbo" width={94} height={30} className="h-7 w-auto" />
            <p className="mt-4 max-w-[260px] text-xs font-semibold leading-6 text-slate-500">
              問い合わせ対応を減らし、体験予約につながる流れを整える管理ツールです。
            </p>
          </div>
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-xs font-extrabold text-slate-950">{column.title}</h3>
              <div className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noreferrer" : undefined}
                    className="block text-xs font-bold text-slate-500 hover:text-[#fe6147]"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
          <div>
            <div className="rounded-xl border border-[#ffd7cf] bg-[#fff0ec] p-5">
              <p className="text-xs font-bold text-slate-600">ご不明な点はお気軽にご相談ください</p>
              <a href="mailto:rizbo@dansul.jp" className="mt-3 flex items-center gap-2 text-sm font-extrabold text-slate-950 hover:text-[#fe6147]">
                <Mail className="h-4 w-4 text-[#fe6147]" aria-hidden="true" />
                rizbo@dansul.jp
              </a>
            </div>
            <p className="mt-5 text-xs font-semibold text-slate-400">© 2025 rizbo. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
