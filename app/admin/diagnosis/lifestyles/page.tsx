// app/admin/diagnosis/lifestyles/page.tsx
import LifestyleAdminClient from "./LifestyleAdminClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export default async function Page() {
  const session = await getServerSession(authOptions);
  const schoolId = (session?.user as any)?.schoolId ?? "daiki.maeda.web"; // ←既存仕様に合わせて置換
  return (
    <div className="p-6">
      <LifestyleAdminClient schoolId={schoolId} />
    </div>
  );
}
