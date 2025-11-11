"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogIn, LogOut, Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ThemeToggle from "@/components/ThemeToggle";

export default function Header() {
  // フック（順序固定）
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // モバイル：プロフィールポップオーバー
  const [profileOpen, setProfileOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  // モバイル：サイドバー（統合版 Sidebar をドロワー表示）
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  // クリック外しでプロフィール閉じる
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!popRef.current) return;
      if (!popRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // ルート変更でメニュー類を閉じる
  useEffect(() => {
    setProfileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  // Esc キーで閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setProfileOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 「Loading chunk…」系は一度だけ自動リロード
  useEffect(() => {
    const KEY = "__chunk_reload_at__";
    const shouldReload = () =>
      Date.now() - Number(sessionStorage.getItem(KEY) || "0") > 10_000;
    const mark = () => sessionStorage.setItem(KEY, String(Date.now()));
    const matcher = (msg: string) =>
      /Loading chunk|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
        msg || ""
      );
    const handleReason = (reason: unknown) => {
      const msg =
        typeof reason === "string"
          ? reason
          : (reason as any)?.message || String(reason ?? "");
      if (matcher(msg) && shouldReload()) {
        mark();
        window.location.href = window.location.href;
      }
    };
    const onUnhandled = (e: PromiseRejectionEvent) => handleReason(e.reason);
    const onError = (e: ErrorEvent) =>
      handleReason((e as any).error || e.message);
    window.addEventListener("unhandledrejection", onUnhandled);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onUnhandled);
      window.removeEventListener("error", onError);
    };
  }, []);

  // 表示判定（/embed は非表示）
  if (pathname?.startsWith("/embed")) return null;
  if (status === "loading" || !mounted)
    return <div className="h-16" aria-hidden />;

  const user = session?.user as {
    name?: string;
    email?: string;
    image?: string;
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b bg-white/90 backdrop-blur border-gray-200 dark:border-gray-800 dark:bg-gray-900/70">
        <div className="mx-auto flex h-full w-full items-center justify-between px-4">
          {/* 左：ハンバーガー（smのみ）＋ ロゴ */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="sm:hidden grid h-10 w-10 place-items-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMenuOpen(true)}
              aria-label="メニュー"
              aria-expanded={menuOpen}
            >
              <Menu size={20} />
            </button>

            <Link
              href="/"
              className="flex items-center gap-2"
              aria-label="トップへ"
            >
              {/* ライト用 */}
              <Image
                src="/logo.svg"
                alt="rizbo"
                width={100}
                height={32}
                priority
                className="object-contain dark:hidden"
              />
              {/* ダーク用 */}
              <Image
                src="/logo_w.svg"
                alt="rizbo"
                width={100}
                height={32}
                className="hidden dark:inline object-contain"
              />
            </Link>
          </div>

          {/* 右：テーマ切替＋認証エリア */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {status === "authenticated" ? (
              <div className="flex items-center gap-4">
                {/* PC：名前/メール */}
                <div className="hidden sm:flex items-center gap-3">
                  {user?.image ? (
                    <img
                      src={user.image}
                      alt={user.name ?? "User"}
                      className="h-9 w-9 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  ) : (
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-gray-200 text-xs text-gray-600 ring-1 ring-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-700">
                      {user?.name?.[0] ?? "U"}
                    </span>
                  )}
                  <div className="text-right">
                    <div className="leading-none text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user?.name ?? "ユーザー"}
                    </div>
                    <div className="leading-none text-xs text-gray-500 dark:text-gray-400">
                      {user?.email}
                    </div>
                  </div>
                </div>

                {/* PC：ログアウト */}
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="hidden sm:inline-flex items-center gap-2 rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  <LogOut size={16} />
                  ログアウト
                </button>

                {/* モバイル：アバター → ポップオーバー */}
                <div className="relative sm:hidden" ref={popRef}>
                  <button
                    type="button"
                    aria-label="アカウントメニュー"
                    aria-expanded={profileOpen}
                    onClick={() => setProfileOpen((v) => !v)}
                    className="grid h-10 w-10 place-items-center rounded-full bg-gray-100 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
                  >
                    {user?.image ? (
                      <img
                        src={user.image}
                        alt={user.name ?? "User"}
                        className="h-9 w-9 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {user?.name?.[0] ?? "U"}
                      </span>
                    )}
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                      <div className="mb-3 flex items-center gap-3">
                        {user?.image ? (
                          <img
                            src={user.image}
                            alt={user.name ?? "User"}
                            className="h-9 w-9 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        ) : (
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-gray-200 text-xs text-gray-600 ring-1 ring-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-700">
                            {user?.name?.[0] ?? "U"}
                          </span>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {user?.name ?? "ユーザー"}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {user?.email}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="flex w-full items-center justify-center gap-2 rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600"
                      >
                        <LogOut size={16} />
                        ログアウト
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* PC：ログイン */}
                <Link
                  href="/login"
                  className="hidden sm:inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-700 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  ログイン
                </Link>
                {/* モバイル：ログイン丸ボタン */}
                <Link
                  href="/login"
                  className="sm:hidden grid h-10 w-10 place-items-center rounded-full bg-primary text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-700"
                  aria-label="ログイン"
                >
                  <LogIn size={18} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* モバイル用サイドバー（統合版）←★ デスクトップは出さない */}
      <Sidebar
        showDesktop={false}
        mobileOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      {/* ヘッダー分の余白 */}
      <div className="h-16" aria-hidden />
    </>
  );
}
