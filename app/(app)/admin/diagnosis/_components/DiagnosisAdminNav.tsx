"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { adminCard } from "./adminStyles";

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

type Props = {
  defaultSchoolId?: string;
};

export default function DiagnosisAdminNav({ defaultSchoolId }: Props) {
  const pathname = usePathname();
  const sp = useSearchParams();

  const schoolId = sp.get("schoolId") ?? defaultSchoolId ?? "";

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (schoolId) p.set("schoolId", schoolId);
    return p.toString();
  }, [schoolId]);

  return (
    <div className={adminCard + " mb-5"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-base font-bold text-slate-900">
            診断編集
          </div>
          <div className="mt-1 text-xs text-slate-500">
            schoolId:{" "}
            <span className="font-mono text-slate-700">
              {schoolId || "(未指定)"}
            </span>
            {!schoolId && (
              <span className="ml-2 text-red-500">
                ※ URLに ?schoolId=xxx を付けてください
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const active = pathname === t.href;
            const href = qs ? `${t.href}?${qs}` : t.href;

            return (
              <Link
                key={t.href}
                href={href}
                className={[
                  "rounded-lg px-3 py-2 text-xs font-semibold border transition",
                  "focus:outline-none focus:ring-2 focus:ring-orange-100",
                  active
                    ? "bg-[#fe6147] text-white border-[#fe6147] shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-orange-200 hover:bg-orange-50 hover:text-[#c53f2b]",
                ].join(" ")}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
