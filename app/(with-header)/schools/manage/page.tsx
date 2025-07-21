import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { promises as fs } from "fs";
import path from "path";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";

// クライアントコンポーネント（動的読み込み）
const AddSchoolForm = dynamic(() => import("../manage/AddSchoolForm"), {
  ssr: false,
});
const DeleteSchoolButton = dynamic(
  () => import("../manage/DeleteSchoolButton"),
  {
    ssr: false,
  }
);
const AdminEditor = dynamic(() => import("../manage/AdminEditor"), {
  ssr: false,
});

export default async function SchoolManagePage() {
  const session = await getServerSession(authOptions);

  console.log("💡 session in /schools/manage:", session); // ← ログ追加！

  const email = session?.user?.email;

  if (!session || !email) {
    redirect("/login");
  }

  const adminFile = await fs.readFile(
    path.join(process.cwd(), "data", "admins.json"),
    "utf8"
  );
  const { superAdmins } = JSON.parse(adminFile);
  const isSuperAdmin = superAdmins.includes(email);

  const filePath = path.join(process.cwd(), "data", "schools.json");
  const data = await fs.readFile(filePath, "utf8");
  const schools = JSON.parse(data);

  const mySchools = Object.entries(schools).filter(
    ([_, admins]: [string, string[]]) =>
      admins.map((a: string) => a.toLowerCase()).includes(email.toLowerCase())
  );

  if (!isSuperAdmin && mySchools.length === 0) {
    return <div>このページへのアクセス権がありません。</div>;
  }

  return (
    <div>
      <h1>学校管理ページ {isSuperAdmin && "（Super Admin）"}</h1>

      {(isSuperAdmin ? Object.entries(schools) : mySchools).map(
        ([schoolName, admins]) => (
          <div key={schoolName}>
            <h2>{schoolName}</h2>
            <Link href={`/schools/${schoolName}/faq`}>FAQ編集</Link>

            <AdminEditor schoolId={schoolName} admins={admins as string[]} />
            {isSuperAdmin && <DeleteSchoolButton schoolId={schoolName} />}
          </div>
        )
      )}

      {isSuperAdmin && <AddSchoolForm />}
    </div>
  );
}
