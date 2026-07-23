import AiInsightsClient from "./AiInsightsClient";
import type { Insight } from "./AiInsightsClient";
import { fetchInternalJson } from "@/lib/internalApi";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const dynamic = "force-dynamic";

export default async function AiInsightsPage() {
  const session = await getServerSession(authOptions);
  const schoolId = String((session?.user as { schoolId?: string } | undefined)?.schoolId ?? "");
  const initialInsight = schoolId
    ? await fetchInternalJson<Insight>(
        `/api/admin/ai-insights?schoolId=${encodeURIComponent(schoolId)}&days=30`,
      )
    : null;

  return <AiInsightsClient initialInsight={initialInsight} />;
}
