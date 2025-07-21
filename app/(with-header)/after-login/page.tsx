// app/(with-header)/after-login/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AfterLoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated") {
      router.push("/schools/manage");
    } else {
      router.push("/login");
    }
  }, [status, router]);

  return <p>ログイン処理中...</p>;
}
