// File: app/(with-header)/after-login/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";

export default async function AfterLoginPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login"); // 未ログインならログインページへ
  }

  // ログイン済みなら学校管理ページへ遷移
  redirect("/schools/manage");
}
