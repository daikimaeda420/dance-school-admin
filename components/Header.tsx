"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Header() {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  console.log("✅ Header: status =", status);
  console.log("✅ Header: session =", session);

  useEffect(() => {
    const checkRoles = async () => {
      if (session?.user?.email) {
        try {
          const [adminRes, superRes] = await Promise.all([
            fetch(`/api/check-admin?email=${session.user.email}`),
            fetch(`/api/check-super-admin?email=${session.user.email}`),
          ]);
          const admin = await adminRes.json();
          const superAdmin = await superRes.json();

          console.log("🔍 /api/check-admin →", admin);
          console.log("🔍 /api/check-super-admin →", superAdmin);

          setIsAdmin(admin.ok);
          setIsSuperAdmin(superAdmin.ok);

          if (session.user.schoolId) {
            console.log("🏫 session.user.schoolId =", session.user.schoolId);
            setSchoolId(session.user.schoolId);
          } else {
            console.log("⚠️ schoolId が session に含まれていません");
          }
        } catch (err) {
          console.error("❌ ロールチェックに失敗しました", err);
        }
      }
    };

    if (status === "authenticated") {
      checkRoles();
    }
  }, [session, status]);

  if (status === "loading") return null;

  return (
    <header className="header flex items-center justify-between p-4 border-b">
      <div className="font-bold text-lg">🕺 Dance School Admin</div>

      {status === "authenticated" && session?.user ? (
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-700">
            {session.user.name} <br />
            <span className="text-gray-500">{session.user.email}</span>
          </div>

          {(isAdmin || isSuperAdmin) && (
            <>
              <Link href="/schools/manage">🏫 学校管理</Link>
              <Link href="/admin/logs">📑 ログ閲覧</Link>
            </>
          )}

          {(isAdmin || isSuperAdmin) && schoolId && (
            <Link href={`/schools/${schoolId}/admins`}>👤 管理者追加</Link>
          )}

          {isSuperAdmin && <Link href="/superadmin">🛠 Super Admin</Link>}

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
