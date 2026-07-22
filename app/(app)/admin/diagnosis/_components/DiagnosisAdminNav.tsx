"use client";

import Link from "next/link";
import { ListChecks } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

type Tab = { href: string; label: string };

const TABS: Tab[] = [
  { href: "/admin/reports", label: "アクセス分析" },
  { href: "/admin/diagnosis/checklist", label: "完成度" },
  { href: "/admin/diagnosis/campuses", label: "校舎" },
  { href: "/admin/diagnosis/courses", label: "コース" },
  { href: "/admin/diagnosis/lifestyles", label: "年代・ライフスタイル" },
  { href: "/admin/diagnosis/genres", label: "ジャンル" },
  { href: "/admin/diagnosis/instructors", label: "講師" },
  { href: "/admin/diagnosis/schedule", label: "スケジュール" },
  { href: "/admin/diagnosis/form", label: "フォーム" },
  { href: "/admin/diagnosis/faqs", label: "よくある質問" },
  { href: "/admin/diagnosis/media", label: "画像・動画" },
];

type Props = { defaultSchoolId?: string };

export default function DiagnosisAdminNav({ defaultSchoolId }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const schoolId = searchParams.get("schoolId") ?? defaultSchoolId ?? "";
  const query = useMemo(() => schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : "", [schoolId]);

  return <div className="mb-6">
    <div className="mb-5">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
        <ListChecks aria-hidden className="h-6 w-6 text-[#fe6147]" />
        診断編集
      </h1>
      <p className="mt-1 text-sm text-slate-500">診断の質問・推薦内容・申込導線を、項目ごとに設定できます。</p>
    </div>
    <nav aria-label="診断編集メニュー" className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="flex min-w-max gap-2">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return <Link key={tab.href} href={`${tab.href}${query}`} className={[
            "rounded-lg border px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-orange-100",
            active ? "border-[#fe6147] bg-[#fe6147] text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-[#c53f2b]",
          ].join(" ")}>{tab.label}</Link>;
        })}
      </div>
    </nav>
  </div>;
}
