// app/after-login/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AfterLoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    console.log("✅ セッション状態:", session);

    if (status === "authenticated" && session?.user) {
      router.replace("/"); // ← 初期リダイレクト先を明示しておくと◎
    } else {
      router.replace("/login");
    }
  }, [status, session, router]);

  return <p>ログイン確認中...</p>;
}
