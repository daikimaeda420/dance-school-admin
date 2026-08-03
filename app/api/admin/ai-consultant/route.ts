import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPORT_KIND = "ai-consultant-report-v1";
const MAX_REPORT_AGE_MS = 24 * 60 * 60 * 1_000;
const ACTION_KEYS = ["PROMOTE_DEMAND_GENRE", "SIMPLIFY_FORM", "ADD_FAQ", "NONE"] as const;
const METRIC_KEYS = ["diagnosisStartRate", "diagnosisCompletionRate", "formSubmitRate", "overallConversionRate"] as const;

type ActionKey = (typeof ACTION_KEYS)[number];
type MetricKey = (typeof METRIC_KEYS)[number];
type InsightSnapshot = {
  days: number;
  funnel: { label: string; count: number }[];
  dropoffs: { label: string; dropoffRate: number | null; reason: string }[];
  rates: Record<MetricKey, number | null>;
  demand: { slug: string; label: string; count: number; change: number | null }[];
  qaTopics: { label: string; count: number }[];
};
type Proposal = {
  actionKey: ActionKey;
  title: string;
  detail: string;
  changePreview: string;
  priority: "high" | "medium" | "low";
  metricKey: MetricKey;
  payload: { slug: string; topic: string; question: string; answer: string };
};
type AiReport = {
  generatedAt: string;
  summary: string;
  demandNarrative: string;
  dropoffNarrative: string;
  monthlyReport: string;
  proposals: Proposal[];
};

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function clean(value: unknown, max = 1_000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parseDays(value: string | null) {
  const days = Number(value ?? 30);
  return Number.isFinite(days) ? Math.max(7, Math.min(90, Math.floor(days))) : 30;
}

function extractOutput(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const record = body as Record<string, unknown>;
  if (typeof record.output_text === "string") return record.output_text.trim();
  if (!Array.isArray(record.output)) return "";
  return record.output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [] as string[];
      const content = (item as Record<string, unknown>).content;
      if (!Array.isArray(content)) return [] as string[];
      return content.flatMap((part) => {
        if (!part || typeof part !== "object") return [] as string[];
        const text = (part as Record<string, unknown>).text;
        return typeof text === "string" ? [text] : [];
      });
    })
    .join("\n")
    .trim();
}

function isInsufficientQuota(body: unknown) {
  if (!body || typeof body !== "object") return false;
  const apiError = (body as { error?: { code?: unknown } }).error;
  return apiError?.code === "insufficient_quota";
}

function asInsight(value: unknown): InsightSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<InsightSnapshot>;
  if (!Array.isArray(candidate.funnel) || !Array.isArray(candidate.dropoffs) || !Array.isArray(candidate.demand) || !Array.isArray(candidate.qaTopics) || !candidate.rates) return null;
  return candidate as InsightSnapshot;
}

function asPriority(value: unknown): Proposal["priority"] {
  return value === "high" || value === "low" ? value : "medium";
}

function asMetricKey(value: unknown): MetricKey {
  return METRIC_KEYS.includes(value as MetricKey) ? (value as MetricKey) : "diagnosisStartRate";
}

function sanitizeReport(value: unknown, insight: InsightSnapshot): AiReport | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const demandSlugs = new Set(insight.demand.map((item) => item.slug));
  const proposals = Array.isArray(record.proposals) ? record.proposals.slice(0, 3).flatMap((item): Proposal[] => {
    if (!item || typeof item !== "object") return [];
    const proposal = item as Record<string, unknown>;
    const actionKey = ACTION_KEYS.includes(proposal.actionKey as ActionKey) ? proposal.actionKey as ActionKey : "NONE";
    const payload = proposal.payload && typeof proposal.payload === "object" ? proposal.payload as Record<string, unknown> : {};
    const normalizedPayload = {
      slug: clean(payload.slug, 120),
      topic: clean(payload.topic, 120),
      question: clean(payload.question, 300),
      answer: clean(payload.answer, 1_500),
    };
    // AIが許可されていない対象を勝手に操作できないよう、既存データに照合する。
    if (actionKey === "PROMOTE_DEMAND_GENRE" && !demandSlugs.has(normalizedPayload.slug)) return [];
    if (actionKey === "ADD_FAQ" && (!normalizedPayload.question || !normalizedPayload.answer)) return [];
    return [{
      actionKey,
      title: clean(proposal.title, 100),
      detail: clean(proposal.detail, 600),
      changePreview: clean(proposal.changePreview, 500),
      priority: asPriority(proposal.priority),
      metricKey: asMetricKey(proposal.metricKey),
      payload: normalizedPayload,
    }];
  }) : [];

  const summary = clean(record.summary, 700);
  const demandNarrative = clean(record.demandNarrative, 700);
  const dropoffNarrative = clean(record.dropoffNarrative, 700);
  const monthlyReport = clean(record.monthlyReport, 1_000);
  if (!summary || !monthlyReport) return null;
  return { generatedAt: new Date().toISOString(), summary, demandNarrative, dropoffNarrative, monthlyReport, proposals };
}

function reportSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["summary", "demandNarrative", "dropoffNarrative", "monthlyReport", "proposals"],
    properties: {
      summary: { type: "string" },
      demandNarrative: { type: "string" },
      dropoffNarrative: { type: "string" },
      monthlyReport: { type: "string" },
      proposals: {
        type: "array",
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["actionKey", "title", "detail", "changePreview", "priority", "metricKey", "payload"],
          properties: {
            actionKey: { type: "string", enum: ACTION_KEYS },
            title: { type: "string" },
            detail: { type: "string" },
            changePreview: { type: "string" },
            priority: { type: "string", enum: ["high", "medium", "low"] },
            metricKey: { type: "string", enum: METRIC_KEYS },
            payload: {
              type: "object",
              additionalProperties: false,
              required: ["slug", "topic", "question", "answer"],
              properties: {
                slug: { type: "string" }, topic: { type: "string" }, question: { type: "string" }, answer: { type: "string" },
              },
            },
          },
        },
      },
    },
  };
}

function buildInstructions(insight: InsightSnapshot) {
  return `あなたはダンススクール向けのAIマーケターです。日本語で、運営者がすぐ判断・承認できる分析レポートを作成してください。

ルール:
- 入力データにない事実・効果・人数を作らない。データ不足なら明記する。
- 個人の会話内容・個人情報には触れず、集計データだけから推測する。
- monthlyReport は「現状 → 優先課題 → 次の一手」の順で、最大5文。
- 提案は最大3件。actionKey が NONE 以外の場合だけ、必ず「既存の安全な反映対象」を使う。
- PROMOTE_DEMAND_GENRE は demand に存在する slug だけを payload.slug に入れる。
- ADD_FAQ は不確かな料金・空き枠を断定せず、スクール確認へ案内する文面にする。
- SIMPLIFY_FORM は必須項目の任意化を提案する。変更は管理者承認後にのみ反映される。

分析対象（直近${insight.days}日、すべて集計値）:
${JSON.stringify({ funnel: insight.funnel, rates: insight.rates, dropoffs: insight.dropoffs, demand: insight.demand, qaTopics: insight.qaTopics })}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const schoolId = url.searchParams.get("schoolId")?.trim() ?? "";
  if (!schoolId) return error("schoolId が必要です");
  const auth = await requireSchoolAccess(schoolId);
  if (!auth.ok) return auth.response;
  const days = parseDays(url.searchParams.get("days"));
  const snapshot = await prisma.analyticsSnapshot.findUnique({
    where: { schoolId_kind_periodDays: { schoolId, kind: REPORT_KIND, periodDays: days } },
    select: { payload: true, generatedAt: true },
  });
  if (!snapshot || Date.now() - snapshot.generatedAt.getTime() > MAX_REPORT_AGE_MS) return NextResponse.json({ report: null });
  return NextResponse.json({ report: snapshot.payload }, { headers: { "Cache-Control": "private, max-age=60" } });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const schoolId = clean(body?.schoolId, 120);
    if (!schoolId) return error("schoolId が必要です");
    const auth = await requireSchoolAccess(schoolId);
    if (!auth.ok) return auth.response;
    const days = parseDays(String(body?.days ?? "30"));
    const base = await prisma.analyticsSnapshot.findUnique({
      where: { schoolId_kind_periodDays: { schoolId, kind: "ai-insights-v2", periodDays: days } },
      select: { payload: true },
    });
    const insight = asInsight(base?.payload);
    if (!insight) return error("先に分析データを読み込んでからAIレポートを生成してください。", 409);
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return error("AI会話のAPI設定がまだ完了していません。", 503);

    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-terra",
        store: false,
        reasoning: { effort: "low" },
        max_output_tokens: 1_400,
        text: { format: { type: "json_schema", name: "rizbo_ai_consultant_report", strict: true, schema: reportSchema() } },
        instructions: buildInstructions(insight),
        input: "集計データをもとにAIレポートを作成してください。",
      }),
      signal: AbortSignal.timeout(25_000),
    });
    const result = await apiResponse.json().catch(() => null);
    if (!apiResponse.ok) {
      console.error("AI consultant response error:", apiResponse.status, result);
      if (apiResponse.status === 429 && isInsufficientQuota(result)) {
        return error("OpenAI APIの利用上限に達しています。OpenAI Platformで請求設定・利用上限を確認してから、もう一度お試しください。", 429);
      }
      return error("AIレポートを生成できませんでした。時間をおいてお試しください。", 502);
    }
    let parsed: unknown;
    try { parsed = JSON.parse(extractOutput(result)); } catch { return error("AIレポートの形式を確認できませんでした。", 502); }
    const report = sanitizeReport(parsed, insight);
    if (!report) return error("AIレポートの内容を確認できませんでした。", 502);
    await prisma.analyticsSnapshot.upsert({
      where: { schoolId_kind_periodDays: { schoolId, kind: REPORT_KIND, periodDays: days } },
      create: { schoolId, kind: REPORT_KIND, periodDays: days, payload: report },
      update: { payload: report, generatedAt: new Date() },
    });
    return NextResponse.json({ report });
  } catch (caught) {
    console.error("[ai-consultant]", caught);
    return error("AIレポートの生成に失敗しました。", 500);
  }
}
