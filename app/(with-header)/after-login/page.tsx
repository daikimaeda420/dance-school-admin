"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AfterLoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    console.log("✅ status:", status);
    console.log("✅ session:", session);

    if (status === "authenticated") {
      if (session?.user?.email) {
        console.log("✅ 認証完了！リダイレクト開始");
        router.replace("/");
      } else {
        console.warn("⚠️ session.user.email がない！ログイン失敗扱い");
        router.replace("/login");
      }
    } else {
      console.log("❌ 未認証");
      router.replace("/login");
    }
  }, [status, router]);

  return <p>ログイン確認中...</p>;
}
