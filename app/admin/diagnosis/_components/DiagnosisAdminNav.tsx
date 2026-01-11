"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

type Tab = { href: string; label: string };

const TABS: Tab[] = [
  { href: "/admin/diagnosis/campuses", label: "校舎" },
  { href: "/admin/diagnosis/courses", label: "コース" },
  { href: "/admin/diagnosis/genres", label: "ジャンル" },
  { href: "/admin/diagnosis/instructors", label: "講師" },
  { href: "/admin/diagnosis/lifestyles", label: "年代・ライフスタイル" },
];

export default function DiagnosisAdminNav() {
  const pathname = usePathname();
  const sp = useSearchParams();

  const schoolId = sp.get("schoolId") ?? "";

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (schoolId) p.set("schoolId", schoolId);
    return p.toString();
  }, [schoolId]);

  return (
    <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
            診断編集
          </div>
          <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            schoolId:{" "}
            <span className="font-mono text-gray-700 dark:text-gray-200">
              {schoolId || "(未指定)"}
            </span>
            {!schoolId && (
              <span className="ml-2 text-red-500 dark:text-red-300">
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
                  "rounded-full px-4 py-2 text-xs font-semibold border transition",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500",
                  active
                    ? "bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 " +
                      "dark:bg-gray-900 dark:text-gray-200 dark:border-gray-800 dark:hover:bg-gray-800/60",
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
