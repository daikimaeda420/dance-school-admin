import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { promises as fs } from "fs";
import path from "path";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";

// クライアントコンポーネント（遅延読み込み）
const SuperAdminEditor = dynamic(() => import("./SuperAdminEditor"), {
  ssr: false,
});

export default async function SuperAdminPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!session || !email) {
    redirect("/login");
  }

  // 管理者データの読み込み
  const adminFile = await fs.readFile(
    path.join(process.cwd(), "data", "admins.json"),
    "utf8"
  );
  const { superAdmins } = JSON.parse(adminFile);
  const isSuperAdmin = superAdmins.includes(email);

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center text-red-600 font-bold text-xl">
        このページへのアクセス権がありません。
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔐 Super Admin 管理</h1>
      <SuperAdminEditor
        superAdmins={superAdmins}
        currentUserEmail={email} // ✅ ここでメールを渡す
      />
    </div>
  );
}
