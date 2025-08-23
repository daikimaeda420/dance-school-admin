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
  /** モバイルドロワーの開閉（ヘッダーのハンバーガーから制御） */
  mobileOpen?: boolean;
  /** モバイルドロワーを閉じる */
  onClose?: () => void;
};

/** 必要に応じて編集してください（デスクトップ/モバイル共通） */
const NAV = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/schools/manage", label: "学校管理", icon: ClipboardList },
  { href: "/faq", label: "Q&A編集", icon: Layers },
  { href: "/admin/chat-history", label: "ユーザーログ", icon: Users },
  { href: "/superadmin", label: "アカウント管理", icon: Settings },
  { href: "/help", label: "ヘルプ", icon: HelpCircle },
];

export default function Sidebar({ mobileOpen = false, onClose }: Props) {
  const pathname = usePathname();

  // /embed はサイドバー非表示
  if (pathname.startsWith("/embed")) return null;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  /** モバイルドロワー表示時は背景スクロール固定 */
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <>
      {/* ====== デスクトップ常設サイドバー ====== */}
      <aside
        className="
          sticky top-16 hidden md:block
          h-[calc(100vh-4rem)] w-64 shrink-0
          border-r bg-white
        "
      >
        <nav className="p-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                isActive(href)
                  ? "bg-amber-50 text-amber-900 border-l-4 border-amber-400"
                  : "text-gray-700 hover:bg-gray-100",
              ].join(" ")}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* ====== モバイルドロワー（同一コンポーネント内） ====== */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* オーバーレイ */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
            onClick={onClose}
          />
          {/* パネル */}
          <aside
            role="dialog"
            aria-modal="true"
            className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="font-semibold">メニュー</div>
              <button
                aria-label="閉じる"
                onClick={onClose}
                className="rounded-md p-2 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="p-2">
              {NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={[
                    "flex items-center gap-3 rounded-lg px-3 py-2",
                    isActive(href)
                      ? "bg-amber-50 text-amber-900 border-l-4 border-amber-400"
                      : "text-gray-700 hover:bg-gray-100",
                  ].join(" ")}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
