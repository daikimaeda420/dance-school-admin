"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AfterLoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    console.log("✅ session:", session); // ← デバッグ用ログ

    if (status === "authenticated") {
      router.replace("/schools/manage");
    } else {
      router.replace("/login");
    }
  }, [status, router]); // ✅ session を除外

  return <p>ログイン確認中...</p>;
}
