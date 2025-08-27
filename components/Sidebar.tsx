// components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Layers,
  ClipboardList,
  Users,
  Settings,
  HelpCircle,
  X,
} from "lucide-react";
import { useEffect } from "react";

type Props = {
  /** md以上で表示する左固定サイドバーを出すか（デフォルト: true） */
  showDesktop?: boolean;
  /** smで使うドロワーの開閉状態 */
  mobileOpen?: boolean;
  /** ドロワーを閉じる */
  onClose?: () => void;
};

// 必要に応じて編集
const NAV = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/schools/manage", label: "学校管理", icon: ClipboardList },
  { href: "/faq", label: "Q&A編集", icon: Layers },
  { href: "/admin/chat-history", label: "ユーザーログ", icon: Users },
  { href: "/superadmin", label: "アカウント管理", icon: Settings },
  { href: "/help", label: "ヘルプ", icon: HelpCircle },
];

export default function Sidebar({
  showDesktop = true,
  mobileOpen = false,
  onClose,
}: Props) {
  const pathname = usePathname();

  // /embed はサイドバー非表示
  if (pathname.startsWith("/embed")) return null;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // モバイルドロワー中は背景スクロール固定
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // 共通クラス
  const baseLink =
    "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors focus-visible:outline-none " +
    "focus-visible:ring-2 focus-visible:ring-primary-400 dark:focus-visible:ring-primary-700";
  const inactive =
    "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800";
  const active =
    "bg-primary-50 text-primary-700 border-l-4 border-primary-400 " +
    "dark:bg-gray-800 dark:text-primary-300 dark:border-primary-600";

  return (
    <>
      {/* ====== デスクトップ常設サイドバー（md以上） ====== */}
      {showDesktop && (
        <aside
          className="
            sticky top-16 hidden md:block
            h-[calc(100vh-4rem)] w-64 shrink-0
            border-r bg-white border-gray-200
            dark:bg-gray-900 dark:border-gray-800
          "
        >
          <nav className="p-3">
            {NAV.map(({ href, label, icon: Icon }) => {
              const selected = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={selected ? "page" : undefined}
                  className={[baseLink, selected ? active : inactive].join(" ")}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
      )}

      {/* ====== モバイルドロワー（smのみ） ====== */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* オーバーレイ */}
          <button
            aria-label="メニューを閉じる"
            onClick={onClose}
            className="absolute inset-0 bg-black/30 backdrop-blur-[1px] dark:bg-black/50"
          />
          {/* パネル */}
          <aside
            role="dialog"
            aria-modal="true"
            className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white shadow-2xl dark:bg-gray-900"
          >
            <div className="flex items-center justify-between border-b px-4 py-3 border-gray-200 dark:border-gray-800">
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                メニュー
              </div>
              <button
                type="button"
                aria-label="閉じる"
                onClick={onClose}
                className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 dark:focus-visible:ring-primary-700"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="p-2">
              {NAV.map(({ href, label, icon: Icon }) => {
                const selected = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    aria-current={selected ? "page" : undefined}
                    className={[
                      baseLink,
                      "w-full",
                      selected ? active : inactive,
                    ].join(" ")}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
