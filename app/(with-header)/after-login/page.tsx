// File: app/(with-header)/after-login/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function AfterLogin() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/"); // ← トップページへリダイレクト
    }
  }, [status]);

  return <p>ログイン処理中...</p>;
}
