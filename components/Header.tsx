"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

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

  return (
    <header className="header">
      <div>🕺 Dance School Admin</div>

      {status === "loading" ? null : session?.user ? (
        <div>
          <img
            src={session.user.image ?? ""}
            alt="プロフィール画像"
            style={{ width: 32, height: 32, borderRadius: "50%" }}
          />
          <div>{session.user.name}</div>
          <div>{session.user.email}</div>

          {isAdmin && <a href="/schools/manage">学校管理</a>}
          {isSuperAdmin && <a href="/superadmin">Super Admin</a>}
          {isAdmin && <a href="/admin/logs">ログ閲覧</a>}

          <button onClick={() => signOut({ callbackUrl: "/login" })}>
            ログアウト
          </button>
        </div>
      ) : (
        <button
          onClick={() => signIn("google", { callbackUrl: "/after-login" })}
        >
          Googleでログイン
        </button>
      )}
    </header>
  );
}
