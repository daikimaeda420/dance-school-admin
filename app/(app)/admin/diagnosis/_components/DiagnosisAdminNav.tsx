"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  FileText,
  GraduationCap,
  ImageIcon,
  ListChecks,
  MapPin,
  MessageSquareText,
  Music2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, type ReactNode } from "react";

type Item = { href: string; label: string; icon: LucideIcon };
type Group = { label: string; items: Item[] };

const GROUPS: Group[] = [
  {
    label: "診断の設計",
    items: [
      { href: "/admin/diagnosis/checklist", label: "完成度", icon: ClipboardCheck },
      { href: "/admin/diagnosis/campuses", label: "校舎", icon: MapPin },
      { href: "/admin/diagnosis/courses", label: "コース", icon: GraduationCap },
      { href: "/admin/diagnosis/lifestyles", label: "年代・ライフスタイル", icon: UsersRound },
      { href: "/admin/diagnosis/genres", label: "ジャンル", icon: Music2 },
      { href: "/admin/diagnosis/instructors", label: "講師", icon: UserRound },
    ],
  },
  {
    label: "予約・申込",
    items: [
      { href: "/admin/diagnosis/schedule", label: "スケジュール", icon: CalendarDays },
      { href: "/admin/diagnosis/form", label: "フォーム", icon: FileText },
    ],
  },
  {
    label: "掲載情報",
    items: [
      { href: "/admin/diagnosis/faqs", label: "よくある質問", icon: MessageSquareText },
      { href: "/admin/diagnosis/media", label: "画像・動画", icon: ImageIcon },
    ],
  },
];

const ALL_ITEMS = GROUPS.flatMap((group) => group.items);

type Props = { defaultSchoolId?: string; children: ReactNode };

export default function DiagnosisAdminNav({ defaultSchoolId, children }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const schoolId = searchParams.get("schoolId") ?? defaultSchoolId ?? "";
  const query = useMemo(() => schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : "", [schoolId]);
  const href = (path: string) => `${path}${query}`;
  const isActive = (path: string) => pathname === path;

  return <div>
    <header className="mb-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
        <ListChecks aria-hidden className="h-6 w-6 text-[#fe6147]" />
        診断編集
      </h1>
      <p className="mt-1 text-sm text-slate-500">診断の質問・推薦内容・申込導線を、項目ごとに設定できます。</p>
    </header>

    <nav aria-label="診断編集メニュー" className="mb-4 overflow-x-auto lg:hidden">
      <div className="flex min-w-max gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        {ALL_ITEMS.map((item) => {
          const Icon = item.icon;
          return <Link key={item.href} href={href(item.href)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${isActive(item.href) ? "bg-[#fe6147] text-white" : "text-slate-600 hover:bg-orange-50 hover:text-[#c53f2b]"}`}><Icon className="h-3.5 w-3.5" />{item.label}</Link>;
        })}
      </div>
    </nav>

    <div className="grid items-start gap-5 lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="sticky top-20 hidden overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:block">
        {GROUPS.map((group, groupIndex) => <section key={group.label} className={groupIndex ? "mt-4 border-t border-slate-100 pt-4" : ""}>
          <p className="mb-2 px-2 text-[11px] font-bold tracking-[0.08em] text-slate-400">{group.label}</p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return <Link key={item.href} href={href(item.href)} aria-current={active ? "page" : undefined} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${active ? "bg-[#fff0ed] text-[#d94b34] shadow-[inset_3px_0_0_#fe6147]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}><Icon className={`h-4 w-4 shrink-0 ${active ? "text-[#fe6147]" : "text-slate-400"}`} />{item.label}</Link>;
            })}
          </div>
        </section>)}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <Link href={href("/admin/reports")} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"><BarChart3 className="h-4 w-4 text-blue-500" />アクセス分析</Link>
        </div>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  </div>;
}
