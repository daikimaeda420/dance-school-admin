import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { fetchInternalJson } from "@/lib/internalApi";
import MonthlyKpiClient, { type MonthlyKpiData } from "./MonthlyKpiClient";

export const dynamic = "force-dynamic";

export default async function MonthlyKpiPage() {
  const session = await getServerSession(authOptions);
  const schoolId = String((session?.user as { schoolId?: string } | undefined)?.schoolId ?? "");
  const initialData = schoolId
    ? await fetchInternalJson<MonthlyKpiData>(`/api/admin/monthly-kpi?schoolId=${encodeURIComponent(schoolId)}&months=6`)
    : null;
  return <MonthlyKpiClient initialData={initialData} initialSchoolId={schoolId} />;
}
