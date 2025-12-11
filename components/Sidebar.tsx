// components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  TimerReset,
  UserCog,
  MessagesSquare,
  HelpCircle,
  X,
  Bot,
  ExternalLink,
  ListChecks, // 診断編集アイコン
} from "lucide-react";
import { useEffect, MouseEvent } from "react";
import { useSession } from "next-auth/react";

type Props = {
  showDesktop?: boolean;
  mobileOpen?: boolean;
  onClose?: () => void;
};

const NAV = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/faq", label: "Q&A編集", icon: MessagesSquare },
  // ← ★ この下に診断編集を追加する（NAV には入れない）
  { href: "/admin/chat-history", label: "ユーザーログ", icon: TimerReset },
  { href: "/superadmin", label: "アカウント管理", icon: UserCog },
  { href: "/help", label: "ヘルプ", icon: HelpCircle },
];

export default function Sidebar({
  showDesktop = true,
  mobileOpen = false,
  onClose,
}: Props) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const schoolId = (session?.user as any)?.schoolId as string | undefined;

  // /embed はサイドバー非表示
  if (pathname.startsWith("/embed")) return null;

  const embedHref = `/embed/chatbot${
    schoolId ? `?school=${encodeURIComponent(schoolId)}` : ""
  }`;

  // ★ 診断編集リンク（schoolId クエリ付き）
  const diagnosisHref = `/admin/diagnosis/campuses${
    schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ""
  }`;

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

  const baseLink =
    "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors focus-visible:outline-none " +
    "focus-visible:ring-2 focus-visible:ring-primary-400 dark:focus-visible:ring-primary-700";

  const inactive =
    "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800";

  const active =
    "bg-primary-50 text-primary-700 border-l-4 border-l-[#fe6147] " +
    "bg-gray-100 dark:bg-gray-800 dark:text-primary-300 dark:border-primary-600 dark:border-l-[#fe6147]";

  /** 小窓で中央表示 */
  const openPreviewPopup = (e?: MouseEvent<HTMLButtonElement>) => {
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey)) {
      window.open(embedHref, "_blank", "noopener,noreferrer");
      return;
    }
    e?.preventDefault?.();

    const width = 420;
    const height = 720;
    const left = Math.max(0, Math.round((window.innerWidth - width) / 2));
    const top = Math.max(0, Math.round((window.innerHeight - height) / 2));

    const features = [
      "popup=yes",
      "noopener",
      "noreferrer",
      "resizable=yes",
      "scrollbars=yes",
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
    ].join(",");

    const w = window.open(embedHref, "chatbotPreview", features);
    if (!w) window.open(embedHref, "_blank", "noopener,noreferrer");
    else w.focus();
  };

  return (
    <>
      {/* ====== デスクトップ常設サイドバー ====== */}
      {showDesktop && (
        <aside
          className="
            sticky top-16 hidden md:block
            h-[calc(100vh-4rem)] w-64 shrink-0
            border-r bg-white border-gray-200
            dark:bg-gray-900 dark:border-gray-800
          "
        >
          <nav className="p-3 space-y-1">
            {/* NAV のループ（ホーム〜Q&A編集） */}
            {NAV.map(({ href, label, icon: Icon }) => {
              // Q&A編集の直後に診断編集を差し込むための処理
              const selected = isActive(href);

              return (
                <div key={href + "_wrap"}>
                  <Link
                    href={href}
                    aria-current={selected ? "page" : undefined}
                    className={[baseLink, selected ? active : inactive].join(
                      " "
                    )}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </Link>

                  {/* ★ Q&A編集の直後だけ診断編集リンクを追加 */}
                  {href === "/faq" && (
                    <Link
                      href={diagnosisHref}
                      aria-current={
                        isActive("/admin/diagnosis") ? "page" : undefined
                      }
                      className={[
                        baseLink,
                        isActive("/admin/diagnosis") ? active : inactive,
                        "ml-1",
                      ].join(" ")}
                    >
                      <ListChecks size={18} />
                      <span>診断編集</span>
                    </Link>
                  )}
                </div>
              );
            })}

            {/* 小窓プレビュー */}
            <button
              type="button"
              onClick={openPreviewPopup}
              title="チャットボットプレビュー"
              className={[
                baseLink,
                inactive,
                "w-full justify-between text-left mt-2",
              ].join(" ")}
            >
              <span className="flex items-center gap-3">
                <Bot size={18} />
                <span>プレビュー</span>
              </span>
              <ExternalLink size={14} className="opacity-70" aria-hidden />
            </button>
          </nav>
        </aside>
      )}

      {/* ====== モバイルメニュー ====== */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            aria-label="メニューを閉じる"
            onClick={onClose}
            className="absolute inset-0 bg-black/30 backdrop-blur-[1px] dark:bg-black/50"
          />

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
                className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="p-2 space-y-1">
              {NAV.map(({ href, label, icon: Icon }) => {
                const selected = isActive(href);

                return (
                  <div key={href + "_wrap_m"}>
                    <Link
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

                    {/* ★ モバイルでも Q&A編集の下に診断編集 */}
                    {href === "/faq" && (
                      <Link
                        href={diagnosisHref}
                        onClick={onClose}
                        aria-current={
                          isActive("/admin/diagnosis") ? "page" : undefined
                        }
                        className={[
                          baseLink,
                          "w-full ml-1",
                          isActive("/admin/diagnosis") ? active : inactive,
                        ].join(" ")}
                      >
                        <ListChecks size={18} />
                        <span>診断編集</span>
                      </Link>
                    )}
                  </div>
                );
              })}

              {/* プレビュー */}
              <button
                type="button"
                onClick={(e) => {
                  openPreviewPopup(e);
                  onClose?.();
                }}
                className={[
                  baseLink,
                  "w-full",
                  inactive,
                  "justify-between text-left mt-2",
                ].join(" ")}
              >
                <span className="flex items-center gap-3">
                  <Bot size={18} />
                  <span>プレビュー</span>
                </span>
                <ExternalLink size={14} className="opacity-70" aria-hidden />
              </button>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
