"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // ✅ /embed 配下ではヘッダーを非表示にする
  if (pathname.startsWith("/embed")) return null;

  const role = session?.user?.role;
  const schoolId = session?.user?.schoolId ?? null;
  const isSuperAdmin = role === "superadmin";
  const isSchoolAdmin = role === "school-admin";

  if (status === "loading") return null;

  return (
    <header className="header flex items-center justify-between p-4 border-b">
      <div className="font-bold text-lg">🕺 Dance School Admin</div>

      {status === "authenticated" ? (
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-700">
            {session.user.name} <br />
            <span className="text-gray-500">{session.user.email}</span>
          </div>

          {(isSchoolAdmin || isSuperAdmin) && (
            <>
              <Link href="/faq">🏫 Q&A編集</Link>

              {/* ✅ schoolId があるときだけチャットボットリンク表示 */}
              {schoolId && (
                <Link
                  href={`/embed/chatbot?school=${schoolId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🤖 チャットボットデモ
                </Link>
              )}

              <Link href="/admin/chat-history">📑 ユーザーログ</Link>
            </>
          )}

          {isSuperAdmin && <Link href="/superadmin">🛠 アカウント管理</Link>}

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-red-500 hover:underline"
          >
            ログアウト
          </button>
        </div>
      ) : (
        <Link href="/login">
          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            ログイン
          </button>
        </Link>
      )}
    </header>
  );
}
