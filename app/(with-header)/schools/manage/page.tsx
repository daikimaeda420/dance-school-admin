import { getServerSession } from "next-auth/next"; // ✅ 修正ポイント
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

  const mySchools = Object.entries(schools).filter(([_, admins]: any) =>
    admins.map((a: string) => a.toLowerCase()).includes(email.toLowerCase())
  );

  if (!isSuperAdmin && mySchools.length === 0) {
    return <div className="">このページへのアクセス権がありません。</div>;
  }

  return (
    <div className="">
      <h1 className="">学校管理ページ {isSuperAdmin && "（Super Admin）"}</h1>

      {(isSuperAdmin ? Object.entries(schools) : mySchools).map(
        ([schoolName, admins]) => (
          <div key={schoolName} className="">
            <div className="">
              <h2 className="">{schoolName}</h2>
              <Link href={`/schools/${schoolName}/faq`} className="">
                FAQ編集
              </Link>
            </div>

            <AdminEditor schoolId={schoolName} admins={admins} />
            {isSuperAdmin && <DeleteSchoolButton schoolId={schoolName} />}
          </div>
        )
      )}

      {isSuperAdmin && <AddSchoolForm />}
    </div>
  );
}
