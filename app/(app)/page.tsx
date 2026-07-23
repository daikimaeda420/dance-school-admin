import HomeClient from "./HomeClient";
import type { DashboardResponse } from "./HomeClient";
import { fetchInternalJson } from "@/lib/internalApi";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const schoolId = String((session?.user as { schoolId?: string } | undefined)?.schoolId ?? "");
  const initialDashboard = schoolId
    ? await fetchInternalJson<DashboardResponse>(
        `/api/dashboard?school=${encodeURIComponent(schoolId)}&days=7`,
      )
    : null;

  return <HomeClient initialDashboard={initialDashboard} />;
}
