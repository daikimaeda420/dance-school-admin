"use client";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/after-login");
    }
  }, [status, router]);

  return (
    <div>
      <h1>ログインページ</h1>
      <button onClick={() => signIn("google")}>Googleでログイン</button>
    </div>
  );
}
