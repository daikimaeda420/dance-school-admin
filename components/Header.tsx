"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Header() {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

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
          setIsAdmin(admin.ok);
          setIsSuperAdmin(superAdmin.ok);
        } catch (err) {
          console.error("ロールチェックに失敗しました", err);
        }
      }
    };

    if (status === "authenticated") {
      checkRoles();
    }
  }, [session, status]);

  if (status === "loading") {
    return null;
  }

  return (
    <header className="header">
      <div>🕺 Dance School Admin</div>

      {status === "authenticated" && session?.user ? (
        <div>
          <div>{session.user.name}</div>
          <div>{session.user.email}</div>

          {isAdmin && <Link href="/schools/manage">学校管理</Link>}
          {isSuperAdmin && <Link href="/superadmin">Super Admin</Link>}
          {isAdmin && <Link href="/admin/logs">ログ閲覧</Link>}

          <button onClick={() => signOut({ callbackUrl: "/login" })}>
            ログアウト
          </button>
        </div>
      ) : (
        <Link href="/login">
          <button>ログイン</button>
        </Link>
      )}
    </header>
  );
}
