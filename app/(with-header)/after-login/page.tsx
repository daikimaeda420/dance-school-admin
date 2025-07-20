"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function AfterLogin() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      // 👇 管理ページに直接遷移させる！
      router.push("/schools/manage");
    }
  }, [status]);

  return <p>ログイン処理中...</p>;
}
