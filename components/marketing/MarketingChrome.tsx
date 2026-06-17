import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, ChevronRight, Mail } from "lucide-react";

export type MarketingNavItem = {
  label: string;
  href: string;
};

type MarketingFooterLink = MarketingNavItem & {
  external?: boolean;
};

type MarketingFooterColumn = {
  title: string;
  links: MarketingFooterLink[];
};

type MarketingHeaderProps = {
  variant?: "landing" | "lower";
  navItems?: MarketingNavItem[];
  mobileNavItems?: MarketingNavItem[];
  showLogin?: boolean;
  loginHref?: string;
  ctaHref?: string;
  ctaLabel?: string;
};

type MarketingFooterProps = {
  brandDescription?: string;
};

export const LOWER_PAGE_NAV_ITEMS: MarketingNavItem[] = [
  { label: "機能", href: "/features" },
  { label: "はじめ方", href: "/getting-started" },
];

export const LOWER_PAGE_MOBILE_NAV_ITEMS: MarketingNavItem[] = [
  ...LOWER_PAGE_NAV_ITEMS,
  { label: "お問い合わせ", href: "/contact" },
];

const MARKETING_FOOTER_COLUMNS: MarketingFooterColumn[] = [
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

function MarketingTextLink({
  href,
  children,
  className,
  external,
}: {
  href: string;
  children: ReactNode;
  className: string;
  external?: boolean;
}) {
  if (external || href.startsWith("http") || href.startsWith("#")) {
    return (
      <a
        href={href}
        target={external || href.startsWith("http") ? "_blank" : undefined}
        rel={external || href.startsWith("http") ? "noreferrer" : undefined}
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function MarketingHeader({
  variant = "lower",
  navItems = LOWER_PAGE_NAV_ITEMS,
  mobileNavItems = LOWER_PAGE_MOBILE_NAV_ITEMS,
  showLogin = false,
  loginHref = "/login",
  ctaHref = "/#cta",
  ctaLabel = "導入の相談",
}: MarketingHeaderProps) {
  const isLanding = variant === "landing";
  const headerClassName = isLanding
    ? "fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl"
    : "sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl";
  const rowClassName = isLanding
    ? "mx-auto flex h-[62px] w-full max-w-[1320px] items-center justify-between px-5 sm:px-8"
    : "mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 py-3 sm:px-8";
  const logoClassName = isLanding ? "h-7 w-auto sm:h-8" : "h-8 w-auto";
  const desktopNavClassName = isLanding
    ? "hidden items-center gap-8 text-[13px] font-extrabold text-slate-800 lg:flex"
    : "hidden items-center gap-7 text-sm font-extrabold text-slate-800 md:flex";
  const mobileNavClassName = isLanding
    ? "marketing-mobile-nav flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 text-[12px] font-extrabold text-slate-700 lg:hidden"
    : "marketing-mobile-nav flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 text-[12px] font-extrabold text-slate-700 md:hidden";
  const ctaClassName = isLanding
    ? "inline-flex min-h-[38px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#fe6147] px-3 text-xs font-extrabold text-white shadow-[0_12px_24px_rgba(254,97,71,0.2)] transition hover:bg-[#e94f36] sm:min-h-[40px] sm:gap-2 sm:px-5 sm:text-sm"
    : "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-[#fe6147] px-5 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(254,97,71,0.2)] transition hover:bg-[#e94f36]";

  return (
    <header className={headerClassName}>
      <div className={rowClassName}>
        <Link href="/" aria-label="rizbo home" className="flex items-center">
          <img src="/logo.svg" alt="rizbo" width={98} height={31} className={logoClassName} />
        </Link>
        <nav className={desktopNavClassName}>
          {navItems.map((item) => (
            <MarketingTextLink
              key={item.href}
              href={item.href}
              className="transition hover:text-[#fe6147]"
            >
              {item.label}
            </MarketingTextLink>
          ))}
        </nav>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {showLogin ? (
            <Link
              href={loginHref}
              className="hidden min-h-[40px] items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-800 transition hover:border-[#fe6147] hover:text-[#fe6147] sm:inline-flex"
            >
              ログイン
            </Link>
          ) : null}
          <MarketingTextLink href={ctaHref} className={ctaClassName}>
            {ctaLabel}
            {isLanding ? (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            )}
          </MarketingTextLink>
        </div>
      </div>
      <nav aria-label="スマートフォン用グローバルナビ" className={mobileNavClassName}>
        {mobileNavItems.map((item) => (
          <MarketingTextLink
            key={`mobile-${item.href}`}
            href={item.href}
            className="inline-flex min-h-[32px] shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-3.5 shadow-sm transition hover:border-[#fe6147] hover:text-[#fe6147]"
          >
            {item.label}
          </MarketingTextLink>
        ))}
      </nav>
    </header>
  );
}

export function MarketingFooter({
  brandDescription = "問い合わせ対応を減らし、体験予約につながる流れを整える管理ツールです。",
}: MarketingFooterProps) {
  return (
    <footer className="border-t border-slate-200 bg-white py-10">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-5 text-sm sm:px-8 md:grid-cols-[1.4fr_0.7fr_0.7fr_1.1fr]">
        <div>
          <img src="/logo.svg" alt="rizbo" width={94} height={30} className="h-7 w-auto" />
          <p className="mt-4 max-w-[260px] text-xs font-semibold leading-6 text-slate-500">
            {brandDescription}
          </p>
        </div>
        {MARKETING_FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <h3 className="text-xs font-extrabold text-slate-950">{column.title}</h3>
            <div className="mt-4 space-y-3">
              {column.links.map((link) => (
                <MarketingTextLink
                  key={link.label}
                  href={link.href}
                  external={link.external}
                  className="block text-xs font-bold text-slate-500 hover:text-[#fe6147]"
                >
                  {link.label}
                </MarketingTextLink>
              ))}
            </div>
          </div>
        ))}
        <div>
          <div className="relative overflow-hidden rounded-xl border border-[#ffd7cf] bg-[#fff0ec] p-5 shadow-[0_14px_34px_rgba(254,97,71,0.08)]">
            <p className="relative text-xs font-bold text-slate-600">ご不明な点はお気軽にご相談ください</p>
            <a
              href="mailto:rizbo@dansul.jp"
              className="relative mt-3 flex items-center gap-3 text-sm font-extrabold text-slate-950 transition hover:text-[#fe6147]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80 text-[#fe6147] shadow-sm">
                <Mail className="h-4 w-4" aria-hidden="true" />
              </span>
              rizbo@dansul.jp
            </a>
          </div>
          <p className="mt-5 text-xs font-semibold text-slate-400">© 2025 rizbo. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
