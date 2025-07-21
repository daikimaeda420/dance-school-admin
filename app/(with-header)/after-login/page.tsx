// app/(with-header)/after-login/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AfterLoginPage() {
  const { data: session, status } = useSession();
  const [hasRedirected, setHasRedirected] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session && !hasRedirected) {
      setHasRedirected(true); // ✅ 1回だけリダイレクトさせる
      router.replace("/schools/manage");
    } else if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, session, hasRedirected, router]);

  return <p>ログイン処理中...</p>;
}
