"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // /embed 配下ではヘッダー非表示
  if (pathname.startsWith("/embed")) return null;

  // session.user に role / schoolId が入っている想定
  const user = session?.user as {
    name?: string;
    email?: string;
    image?: string;
    role?: string;
    schoolId?: string;
  };

  const role = user?.role;
  const schoolId = user?.schoolId ?? null;
  const isSuperAdmin = role === "superadmin";
  const isSchoolAdmin = role === "school-admin";

  if (status === "loading") return null;

  return (
    <>
      {/* 固定ヘッダー */}
      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b bg-white/90 backdrop-blur flex items-center">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-lg">🕺 Dance School Admin</div>

            {status === "authenticated" ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:block text-sm text-gray-700 text-right">
                  {user?.name}
                  <br />
                  <span className="text-gray-500">{user?.email}</span>
                </div>

                {(isSchoolAdmin || isSuperAdmin) && (
                  <>
                    <Link
                      href="/faq"
                      className="text-sm text-gray-700 hover:text-gray-900"
                    >
                      🏫 Q&A編集
                    </Link>

                    {schoolId && (
                      <Link
                        href={`/embed/chatbot?school=${schoolId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-700 hover:text-gray-900"
                      >
                        🤖 チャットボットデモ
                      </Link>
                    )}

                    <Link
                      href="/admin/chat-history"
                      className="text-sm text-gray-700 hover:text-gray-900"
                    >
                      📑 ユーザーログ
                    </Link>
                  </>
                )}

                {isSuperAdmin && (
                  <Link
                    href="/superadmin"
                    className="text-sm text-gray-700 hover:text-gray-900"
                  >
                    🛠 アカウント管理
                  </Link>
                )}

                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-sm text-red-600 hover:underline"
                >
                  ログアウト
                </button>
              </div>
            ) : (
              <Link href="/login" className="inline-flex">
                <span className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  ログイン
                </span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ヘッダー分の余白（高さは h-16 に合わせる） */}
      <div className="h-16" aria-hidden />
    </>
  );
}
