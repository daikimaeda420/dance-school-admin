"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";

const AddSchoolForm = dynamic(() => import("./AddSchoolForm"), {
  ssr: false,
});
const DeleteSchoolButton = dynamic(() => import("./DeleteSchoolButton"), {
  ssr: false,
});
const AdminEditor = dynamic(() => import("./AdminEditor"), {
  ssr: false,
});

export default function SchoolManagePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [schools, setSchools] = useState<any>({});
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // ✅ セッションデータのログ出力（useSessionの後）
  console.log("[Page]", "session data:", session);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status]);

  useEffect(() => {
    const fetchData = async () => {
      if (status === "authenticated") {
        try {
          const res = await fetch("/api/admin-data");
          const json = await res.json();
          console.log("💡admin-data:", json);

          if (json.ok) {
            setSchools(json.schools);
            setIsSuperAdmin(json.isSuperAdmin);
          }
        } catch (e) {
          console.error("❌ fetch error", e);
        }
      }
    };
    fetchData();
  }, [status]);

  if (status === "loading") return <div>読み込み中...</div>;

  const email = session?.user?.email ?? "";

  const mySchools = Object.entries(schools ?? {}).filter(
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
