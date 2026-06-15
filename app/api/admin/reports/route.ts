import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAccessibleSchool } from "@/lib/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FAQItem =
  | { type: "question"; question: string; answer: string; url?: string }
  | {
      type: "select";
      question: string;
      answer?: string;
      options?: { label: string; next: FAQItem }[];
    };

const DAY_MS = 24 * 60 * 60 * 1000;

const FUNNEL_STEPS = [
  { key: "Q1_VIEW", label: "診断開始" },
  { key: "Q1_ANSWER", label: "Q1回答" },
  { key: "Q2_ANSWER", label: "Q2回答" },
  { key: "Q3_ANSWER", label: "Q3回答" },
  { key: "Q4_ANSWER", label: "Q4回答" },
  { key: "Q5_ANSWER", label: "Q5回答" },
  { key: "Q6_ANSWER", label: "Q6回答" },
  { key: "RESULT_VIEW", label: "結果表示" },
  { key: "FORM_OPEN", label: "フォーム到達" },
  { key: "FORM_SUBMIT", label: "申込完了" },
] as const;

const CLICK_STEPS = [
  { key: "CHAT_ICON_CLICK", label: "チャットアイコン" },
  { key: "DIAGNOSIS_BANNER_CLICK", label: "診断バナー" },
] as const;

function parseDays(value: string | null) {
  const raw = Number(value ?? 30);
  if (!Number.isFinite(raw)) return 30;
  return Math.min(365, Math.max(1, Math.floor(raw)));
}

function rate(part: number, total: number) {
  if (total <= 0) return null;
  return Math.round((part / total) * 100);
}

function countFaqItems(items: FAQItem[] | null | undefined): number {
  if (!Array.isArray(items)) return 0;

  let count = 0;
  const walk = (item: FAQItem) => {
    count += 1;
    if (item?.type === "select") {
      for (const option of item.options ?? []) {
        if (option?.next) walk(option.next);
      }
    }
  };

  for (const item of items) walk(item);
  return count;
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = val == null ? "" : String(val);
  }
  return out;
}

function extractFieldValue(fields: Record<string, string>, keywords: string[]) {
  for (const [key, value] of Object.entries(fields)) {
    const lower = key.toLowerCase();
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return String(value ?? "").slice(0, 80);
    }
  }
  return "";
}

function parseStoredQuestion(question: unknown) {
  const text =
    typeof question === "string"
      ? question.trim()
      : question == null
      ? ""
      : JSON.stringify(question);

  if (!text.startsWith("{")) {
    return { type: "question" as const, label: text };
  }

  try {
    const parsed = JSON.parse(text) as {
      type?: unknown;
      ctaLabel?: unknown;
      ctaId?: unknown;
    };
    if (parsed?.type === "cta") {
      const label =
        typeof parsed.ctaLabel === "string" && parsed.ctaLabel.trim()
          ? parsed.ctaLabel.trim()
          : "CTAクリック";
      return { type: "cta" as const, label };
    }
  } catch {
    // Plain text that happens to start with "{" should still be treated as a question.
  }

  return { type: "question" as const, label: text };
}

function withSchool(path: string, schoolId: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}schoolId=${encodeURIComponent(schoolId)}`;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const requestedSchoolId =
      url.searchParams.get("schoolId") ?? url.searchParams.get("school");
    const access = await resolveAccessibleSchool(requestedSchoolId);
    if (!access.ok) return access.response;

    const schoolId = access.schoolId;
    const days = parseDays(url.searchParams.get("days"));
    const since = new Date(Date.now() - days * DAY_MS);

    const [
      faqRow,
      faqLogs,
      diagnosisLogs,
      submissionCount,
      recentSubmissions,
    ] = await Promise.all([
      prisma.faq.findUnique({
        where: { schoolId },
        select: { items: true, chatEnabled: true, diagnosisEnabled: true },
      }),
      prisma.faqLog.findMany({
        where: { school: schoolId, timestamp: { gte: since } },
        orderBy: { timestamp: "desc" },
        take: 5000,
        select: {
          id: true,
          sessionId: true,
          timestamp: true,
          question: true,
          answer: true,
          url: true,
        },
      }),
      prisma.diagnosisSessionLog.findMany({
        where: { schoolId, createdAt: { gte: since } },
        orderBy: { createdAt: "asc" },
        select: { sessionId: true, stepKey: true, stepLabel: true, createdAt: true },
      }),
      prisma.diagnosisFormSubmission.count({
        where: { schoolId, createdAt: { gte: since } },
      }),
      prisma.diagnosisFormSubmission.findMany({
        where: { schoolId, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, fields: true, createdAt: true },
      }),
    ]);

    const faqItemCount = countFaqItems((faqRow?.items as FAQItem[] | null) ?? null);
    const qaSessions = new Set(faqLogs.map((log) => log.sessionId)).size;
    const topQuestionCounts = new Map<string, number>();

    let answeredCount = 0;
    let unansweredCount = 0;
    let selectViewCount = 0;
    let ctaClicks = 0;

    const recentQa = faqLogs.slice(0, 12).map((log) => {
      const parsed = parseStoredQuestion(log.question);
      const answer = String(log.answer ?? "");
      const isSelect = answer === "(選択肢)";
      const eventType = parsed.type === "cta" ? "cta" : isSelect ? "select" : answer ? "answer" : "unanswered";

      return {
        id: log.id,
        sessionId: log.sessionId,
        timestamp: log.timestamp,
        label: parsed.label,
        answer: answer.slice(0, 160),
        url: log.url,
        eventType,
      };
    });

    for (const log of faqLogs) {
      const parsed = parseStoredQuestion(log.question);
      const answer = String(log.answer ?? "");
      const isSelect = answer === "(選択肢)";

      if (parsed.type === "cta") {
        ctaClicks += 1;
        continue;
      }

      if (isSelect) {
        selectViewCount += 1;
        continue;
      }

      if (answer.trim()) {
        answeredCount += 1;
      } else {
        unansweredCount += 1;
      }

      if (parsed.label) {
        topQuestionCounts.set(parsed.label, (topQuestionCounts.get(parsed.label) ?? 0) + 1);
      }
    }

    const topQuestions = Array.from(topQuestionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([question, count]) => ({ question, count }));

    const uniqueByStep = new Map<string, Set<string>>();
    for (const log of diagnosisLogs) {
      if (!uniqueByStep.has(log.stepKey)) uniqueByStep.set(log.stepKey, new Set());
      uniqueByStep.get(log.stepKey)!.add(log.sessionId);
    }

    const flowKeys = new Set(FUNNEL_STEPS.map((step) => step.key));
    const flowSessions = new Set(
      diagnosisLogs
        .filter(
          (log) =>
            flowKeys.has(log.stepKey as (typeof FUNNEL_STEPS)[number]["key"]) ||
            log.stepKey.startsWith("FORM_FIELD_") ||
            log.stepKey.startsWith("FORM_ABANDON_"),
        )
        .map((log) => log.sessionId),
    );
    const totalDiagnosisSessions =
      uniqueByStep.get("Q1_VIEW")?.size ?? flowSessions.size;

    const funnel = FUNNEL_STEPS.map((step, index) => {
      const count = uniqueByStep.get(step.key)?.size ?? 0;
      const prevCount =
        index === 0
          ? null
          : uniqueByStep.get(FUNNEL_STEPS[index - 1].key)?.size ?? 0;
      const retentionRate = prevCount == null ? null : rate(count, prevCount);
      const dropoffRate =
        prevCount == null || prevCount <= 0
          ? null
          : Math.max(0, Math.round(((prevCount - count) / prevCount) * 100));

      return {
        stepKey: step.key,
        label: step.label,
        count,
        rateFromStart: rate(count, totalDiagnosisSessions),
        prevCount,
        retentionRate,
        dropoffRate,
      };
    });

    const clickStats = CLICK_STEPS.map((step) => ({
      stepKey: step.key,
      label: step.label,
      totalClicks: diagnosisLogs.filter((log) => log.stepKey === step.key).length,
      uniqueSessions: uniqueByStep.get(step.key)?.size ?? 0,
    }));

    const formOpenCount = uniqueByStep.get("FORM_OPEN")?.size ?? 0;
    const fieldKeys = Array.from(
      new Set(
        diagnosisLogs
          .filter((log) => log.stepKey.startsWith("FORM_FIELD_"))
          .map((log) => log.stepKey),
      ),
    ).sort();

    const formFieldSteps = fieldKeys.slice(0, 12).map((key) => {
      const label = key.replace("FORM_FIELD_", "");
      const reachedCount = uniqueByStep.get(key)?.size ?? 0;
      const abandonCount = uniqueByStep.get(`FORM_ABANDON_${label}`)?.size ?? 0;
      return {
        stepKey: key,
        label,
        reachedCount,
        abandonCount,
        reachedRate: rate(reachedCount, formOpenCount),
      };
    });

    const recentConversions = recentSubmissions.map((submission) => {
      const fields = asStringRecord(submission.fields);
      const name =
        extractFieldValue(fields, ["name", "お名前", "氏名", "名前"]) ||
        Object.values(fields).find(Boolean)?.slice(0, 80) ||
        "（不明）";

      return {
        id: submission.id,
        createdAt: submission.createdAt,
        name,
        email: extractFieldValue(fields, ["email", "mail", "メール"]),
        tel: extractFieldValue(fields, ["tel", "phone", "電話"]),
        course: extractFieldValue(fields, ["course", "class", "コース", "クラス", "日程"]),
      };
    });

    const resultViews = uniqueByStep.get("RESULT_VIEW")?.size ?? 0;
    const formSubmits = uniqueByStep.get("FORM_SUBMIT")?.size ?? 0;
    const bannerClicks =
      clickStats.find((stat) => stat.stepKey === "DIAGNOSIS_BANNER_CLICK")
        ?.totalClicks ?? 0;

    const recommendations: {
      title: string;
      detail: string;
      tone: "ok" | "warn" | "danger";
      href?: string;
      actionLabel?: string;
    }[] = [];

    if (qaSessions === 0) {
      recommendations.push({
        title: "Q&Aの利用ログがありません",
        detail: "設置ページでチャットボットが表示されているか、導線が見つけやすいかを確認してください。",
        tone: "warn",
        href: withSchool("/admin/qa/checklist", schoolId),
        actionLabel: "Q&A完成度を見る",
      });
    } else if (unansweredCount > 0) {
      recommendations.push({
        title: "未回答ログをFAQへ反映してください",
        detail: `直近${days}日で未回答ログが${unansweredCount}件あります。よく出る質問から回答を追加すると自己解決率を上げられます。`,
        tone: "danger",
        href: "/admin/chat-history",
        actionLabel: "ユーザーログを見る",
      });
    }

    if (totalDiagnosisSessions === 0) {
      recommendations.push({
        title: "診断の開始ログがありません",
        detail: "診断バナーや埋め込み導線が表示されているかを確認してください。開始数がない期間はファネル改善判断ができません。",
        tone: "warn",
        href: withSchool("/admin/diagnosis/checklist", schoolId),
        actionLabel: "診断完成度を見る",
      });
    } else if (resultViews > 0 && rate(formOpenCount, resultViews)! < 35) {
      recommendations.push({
        title: "結果画面からフォームへの導線を確認してください",
        detail: `結果表示からフォーム到達への転換率が${rate(formOpenCount, resultViews)}%です。CTA文言、ボタン位置、体験日程の見せ方を見直す余地があります。`,
        tone: "warn",
        href: withSchool("/admin/diagnosis/form", schoolId),
        actionLabel: "フォーム設定を見る",
      });
    }

    if (formOpenCount > 0 && submissionCount === 0) {
      recommendations.push({
        title: "フォーム到達後の申込完了がありません",
        detail: "入力項目の多さ、必須項目、日程選択のわかりやすさ、送信後のメール設定を確認してください。",
        tone: "danger",
        href: withSchool("/admin/diagnosis/form", schoolId),
        actionLabel: "フォーム設定を見る",
      });
    }

    if (bannerClicks > 0 && totalDiagnosisSessions === 0) {
      recommendations.push({
        title: "診断バナークリック後の遷移を確認してください",
        detail: "バナークリックはありますが診断開始ログがありません。外部サイト側のリンク先や埋め込みURLのschoolIdを確認してください。",
        tone: "danger",
        href: withSchool("/admin/diagnosis/checklist", schoolId),
        actionLabel: "診断完成度を見る",
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        title: "大きな未対応項目はありません",
        detail: "現在の期間では重大な詰まりは見えていません。引き続き未回答ログとフォーム到達率を定期確認してください。",
        tone: "ok",
      });
    }

    return NextResponse.json({
      schoolId,
      days,
      generatedAt: new Date(),
      summary: [
        {
          key: "qaSessions",
          label: "Q&Aセッション",
          value: qaSessions,
          note: `ログ ${faqLogs.length.toLocaleString()}件`,
        },
        {
          key: "qaAnswers",
          label: "Q&A回答",
          value: answeredCount,
          note: `選択肢表示 ${selectViewCount.toLocaleString()}件`,
        },
        {
          key: "diagnosisStarts",
          label: "診断開始",
          value: totalDiagnosisSessions,
          note: `バナークリック ${bannerClicks.toLocaleString()}件`,
        },
        {
          key: "formOpenRate",
          label: "フォーム到達率",
          value: rate(formOpenCount, totalDiagnosisSessions),
          suffix: "%",
          note: `${formOpenCount.toLocaleString()} / ${totalDiagnosisSessions.toLocaleString()} セッション`,
        },
        {
          key: "submissions",
          label: "申込数",
          value: submissionCount,
          note: `診断開始比 ${rate(submissionCount, totalDiagnosisSessions) ?? 0}%`,
        },
      ],
      qa: {
        chatEnabled: Boolean(faqRow?.chatEnabled),
        faqItemCount,
        sessions: qaSessions,
        logCount: faqLogs.length,
        answeredCount,
        unansweredCount,
        selectViewCount,
        ctaClicks,
        topQuestions,
        recent: recentQa,
      },
      diagnosis: {
        diagnosisEnabled: Boolean(faqRow?.diagnosisEnabled),
        totalSessions: totalDiagnosisSessions,
        resultViews,
        formOpens: formOpenCount,
        formSubmits,
        submissions: submissionCount,
        bannerClicks,
        clickStats,
        funnel,
        formFieldSteps,
      },
      conversions: {
        count: submissionCount,
        recent: recentConversions,
      },
      recommendations,
    });
  } catch (error) {
    console.error("[admin reports] error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
