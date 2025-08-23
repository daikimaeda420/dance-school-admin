"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function Header() {
  // ❶ フックは常に最上部
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // ❷ マウントフラグ
  useEffect(() => {
    setMounted(true);
  }, []);

  // ❸ 外クリックで閉じる
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!popRef.current) return;
      if (!popRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // ❹ 「Loading chunk 〜」系エラー検知→一度だけ自動リロード
  useEffect(() => {
    const KEY = "__chunk_reload_at__";
    const shouldReload = () => {
      const last = Number(sessionStorage.getItem(KEY) || "0");
      return Date.now() - last > 10_000; // 10秒以内の連続リロードは防止
    };
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
        // 位置情報も含め完全リロード
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

  // ❺ 表示判定は“後段”で
  if (pathname.startsWith("/embed")) return null;
  if (status === "loading" || !mounted)
    return <div className="h-16" aria-hidden />;

  const user = session?.user as {
    name?: string;
    email?: string;
    image?: string;
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-4">
          {/* 左：サービスロゴ（無ければテキストだけ） */}
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/logo.svg"
              alt="サービスロゴ"
              className="h-7 w-7 object-contain"
              onError={(e) =>
                ((e.target as HTMLImageElement).style.display = "none")
              }
            />
            <span className="text-lg font-semibold tracking-tight">
              Dance School Admin
            </span>
          </Link>

          {/* 右：認証エリア */}
          {status === "authenticated" ? (
            <div className="flex items-center gap-4">
              {/* PC：名前/メール */}
              <div className="hidden sm:flex items-center gap-3">
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={user.name ?? "User"}
                    className="h-9 w-9 rounded-full object-cover ring-1 ring-gray-200"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                ) : (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-gray-200 text-xs text-gray-600 ring-1 ring-gray-200">
                    {user?.name?.[0] ?? "U"}
                  </span>
                )}
                <div className="text-right">
                  <div className="leading-none text-sm font-medium text-gray-900">
                    {user?.name ?? "ユーザー"}
                  </div>
                  <div className="leading-none text-xs text-gray-500">
                    {user?.email}
                  </div>
                </div>
              </div>

              {/* PC：ログアウト */}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="hidden sm:inline-flex items-center gap-2 rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
              >
                <LogOut size={16} />
                ログアウト
              </button>

              {/* モバイル：アバター → ポップオーバー */}
              <div className="relative sm:hidden" ref={popRef}>
                <button
                  aria-label="アカウントメニュー"
                  aria-expanded={open}
                  onClick={() => setOpen((v) => !v)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-gray-100 ring-1 ring-gray-200"
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
                    <span className="text-sm font-semibold text-gray-700">
                      {user?.name?.[0] ?? "U"}
                    </span>
                  )}
                </button>

                {open && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
                    <div className="mb-3 flex items-center gap-3">
                      {user?.image ? (
                        <img
                          src={user.image}
                          alt={user.name ?? "User"}
                          className="h-9 w-9 rounded-full object-cover ring-1 ring-gray-200"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      ) : (
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-gray-200 text-xs text-gray-600 ring-1 ring-gray-200">
                          {user?.name?.[0] ?? "U"}
                        </span>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user?.name ?? "ユーザー"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user?.email}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="flex w-full items-center justify-center gap-2 rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
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
                className="hidden sm:inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                ログイン
              </Link>
              {/* モバイル：ログイン丸ボタン */}
              <Link
                href="/login"
                className="sm:hidden grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-white hover:bg-blue-700"
                aria-label="ログイン"
              >
                <LogIn size={18} />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ヘッダー分の余白 */}
      <div className="h-16" aria-hidden />
    </>
  );
}
