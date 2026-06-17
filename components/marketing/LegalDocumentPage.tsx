import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Mail } from "lucide-react";

export type LegalSection = {
  title: string;
  body: string[];
  bullets?: string[];
  definitionList?: Array<{
    term: string;
    description: string;
  }>;
};

type LegalDocumentPageProps = {
  eyebrow: string;
  title: string;
  titleParts?: string[];
  description: string;
  dateLabel: string;
  sections: LegalSection[];
  contactTitle: string;
  contactDescription: string;
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

function sectionId(title: string) {
  return title.replace(/[^0-9]/g, "");
}

function Footer() {
  return (
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
            <a
              href="mailto:rizbo@dansul.jp"
              className="mt-3 flex items-center gap-2 text-sm font-extrabold text-slate-950 hover:text-[#fe6147]"
            >
              <Mail className="h-4 w-4 text-[#fe6147]" aria-hidden="true" />
              rizbo@dansul.jp
            </a>
          </div>
          <p className="mt-5 text-xs font-semibold text-slate-400">© 2025 rizbo. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export function LegalDocumentPage({
  eyebrow,
  title,
  titleParts,
  description,
  dateLabel,
  sections,
  contactTitle,
  contactDescription,
}: LegalDocumentPageProps) {
  const renderedTitleParts = titleParts ?? [title];

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
          <p className="mt-8 text-sm font-extrabold text-[#fe6147]">{eyebrow}</p>
          <h1 className="mt-3 max-w-[820px] text-[32px] font-extrabold leading-tight tracking-normal text-slate-950 sm:text-[48px]">
            {renderedTitleParts.map((part) => (
              <span key={part} className="inline-block">
                {part}
              </span>
            ))}
          </h1>
          <p className="mt-5 max-w-[820px] text-base font-semibold leading-8 text-slate-700">{description}</p>
          <p className="mt-5 text-sm font-bold text-slate-500">{dateLabel}</p>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">
            <nav className="sticky top-24 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <p className="text-xs font-extrabold text-slate-950">目次</p>
              <ol className="mt-4 space-y-2 text-xs font-bold leading-5 text-slate-500">
                {sections.map((section) => (
                  <li key={section.title}>
                    <a href={`#${sectionId(section.title)}`} className="hover:text-[#fe6147]">
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:p-9">
            <div className="space-y-10">
              {sections.map((section) => (
                <section
                  id={sectionId(section.title)}
                  key={section.title}
                  className="scroll-mt-28 border-b border-slate-100 pb-10 last:border-b-0 last:pb-0"
                >
                  <h2 className="text-xl font-extrabold leading-8 text-slate-950">{section.title}</h2>
                  <div className="mt-4 space-y-4 text-sm font-semibold leading-8 text-slate-700">
                    {section.body.map((paragraph, index) => (
                      <p key={`${section.title}-body-${index}`}>{paragraph}</p>
                    ))}
                  </div>
                  {section.definitionList ? (
                    <dl className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/60">
                      {section.definitionList.map((item) => (
                        <div key={item.term} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[150px_1fr]">
                          <dt className="font-extrabold text-slate-950">{item.term}</dt>
                          <dd className="font-semibold leading-7 text-slate-700">{item.description}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {section.bullets ? (
                    <ul className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3 text-sm font-semibold leading-7 text-slate-700">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#fe6147]" aria-hidden="true" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="px-5 pb-12 sm:px-8">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-4 rounded-xl border border-[#ffd7cf] bg-[#fff0ec] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950">{contactTitle}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{contactDescription}</p>
          </div>
          <a
            href="mailto:rizbo@dansul.jp"
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-[#fe6147] px-6 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(254,97,71,0.2)] transition hover:bg-[#e94f36]"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            rizbo@dansul.jp
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
