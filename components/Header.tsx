"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function Header() {
  // ❶ フックは常に最上部で同じ順序で呼ぶ（条件分岐の外）
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // ❷ マウント後フラグ（SSR差分を避ける。フック順序は変えない）
  useEffect(() => {
    setMounted(true);
  }, []);

  // ❸ クリック外しでメニューを閉じる（フックは既に呼んだ後）
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!popRef.current) return;
      if (!popRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // ❹ 表示可否は“レンダーの後段”で判定（フック順序には影響させない）
  const hideOnEmbed = pathname.startsWith("/embed");
  if (hideOnEmbed) return null;

  // ローディング中は空のスペーサーだけ（ヘッダー高さは確保）
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
          {/* 左：サービスロゴ（なければテキストだけ出る） */}
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
