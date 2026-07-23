import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAccessibleSchool } from "@/lib/authz";

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (date: Date) => `${date.getMonth() + 1}月`;
const percentage = (part: number, total: number) => total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
const numberInRange = (value: unknown, fallback: number, max: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(max, parsed)) : fallback;
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthsForRange(count: number) {
  const current = startOfMonth(new Date());
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(current.getFullYear(), current.getMonth() - (count - index - 1), 1);
    return { key: monthKey(date), label: monthLabel(date), start: date, end: new Date(date.getFullYear(), date.getMonth() + 1, 1) };
  });
}

async function loadKpi(schoolId: string, count: number) {
  const months = monthsForRange(count);
  const since = months[0].start;
  const periodDays = count * 31;
  const [settings, snapshot] = await Promise.all([
    prisma.revenueSimulationSettings.upsert({ where: { schoolId }, update: {}, create: { schoolId } }),
    prisma.analyticsSnapshot.findUnique({
      where: { schoolId_kind_periodDays: { schoolId, kind: "monthly-kpi-v1", periodDays } },
      select: { payload: true, generatedAt: true },
    }),
  ]);
  type RawMonth = Omit<MonthPayload, "firstMonthRevenue" | "ltvRevenue">;
  const toRevenue = (rawMonths: RawMonth[]) => rawMonths.map((month) => {
    const enrolled = month.applications * settings.expectedEnrollmentRate / 100;
    return {
      ...month,
      firstMonthRevenue: Math.round(enrolled * (settings.enrollmentFee + settings.monthlyFee + settings.otherFees)),
      ltvRevenue: Math.round(enrolled * (settings.enrollmentFee + settings.otherFees + settings.monthlyFee * settings.averageRetentionMonths)),
    };
  });
  if (snapshot && Date.now() - snapshot.generatedAt.getTime() < 5 * 60_000) {
    return { months: toRevenue((snapshot.payload as { months: RawMonth[] }).months), settings };
  }
  const [logs, submissions] = await Promise.all([
    prisma.diagnosisSessionLog.findMany({
      where: { schoolId, createdAt: { gte: since }, stepKey: { in: ["SITE_VISIT", "Q1_VIEW", "FORM_OPEN", "FORM_SUBMIT"] } },
      select: { sessionId: true, stepKey: true, createdAt: true },
    }),
    prisma.diagnosisFormSubmission.findMany({ where: { schoolId, createdAt: { gte: since } }, select: { createdAt: true } }),
  ]);

  const rawMonths: RawMonth[] = months.map((month) => {
    const stepSessions = new Map<string, Set<string>>();
    logs.filter((log) => log.createdAt >= month.start && log.createdAt < month.end).forEach((log) => {
      if (!stepSessions.has(log.stepKey)) stepSessions.set(log.stepKey, new Set());
      stepSessions.get(log.stepKey)!.add(log.sessionId);
    });
    const siteVisitors = stepSessions.get("SITE_VISIT")?.size ?? 0;
    const starts = stepSessions.get("Q1_VIEW")?.size ?? 0;
    const formOpens = stepSessions.get("FORM_OPEN")?.size ?? 0;
    const loggedSubmits = stepSessions.get("FORM_SUBMIT")?.size ?? 0;
    const submissionCount = submissions.filter((submission) => submission.createdAt >= month.start && submission.createdAt < month.end).length;
    const applications = Math.max(loggedSubmits, submissionCount);
    return {
      key: month.key, label: month.label, applications, bookingRate: percentage(applications, starts),
      diagnosisStartRate: starts <= siteVisitors ? percentage(starts, siteVisitors) : 0,
      formSubmitRate: percentage(applications, formOpens),
    };
  });
  await prisma.analyticsSnapshot.upsert({
    where: { schoolId_kind_periodDays: { schoolId, kind: "monthly-kpi-v1", periodDays } },
    create: { schoolId, kind: "monthly-kpi-v1", periodDays, payload: { months: rawMonths } },
    update: { payload: { months: rawMonths }, generatedAt: new Date() },
  });
  return { months: toRevenue(rawMonths), settings };
}

type MonthPayload = { key: string; label: string; applications: number; bookingRate: number; diagnosisStartRate: number; formSubmitRate: number; firstMonthRevenue: number; ltvRevenue: number };

export async function GET(req: NextRequest) {
  try {
    const access = await resolveAccessibleSchool(new URL(req.url).searchParams.get("schoolId"));
    if (!access.ok) return access.response;
    const months = Math.max(3, Math.min(12, Number(new URL(req.url).searchParams.get("months")) || 6));
    return NextResponse.json(await loadKpi(access.schoolId!, months), { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } });
  } catch (error) {
    console.error("[monthly-kpi]", error);
    return NextResponse.json({ error: "月次KPIの取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const access = await resolveAccessibleSchool(body.schoolId);
    if (!access.ok) return access.response;
    const settings = await prisma.revenueSimulationSettings.upsert({
      where: { schoolId: access.schoolId! },
      update: {
        expectedEnrollmentRate: numberInRange(body.expectedEnrollmentRate, 50, 100),
        enrollmentFee: Math.round(numberInRange(body.enrollmentFee, 0, 10_000_000)),
        monthlyFee: Math.round(numberInRange(body.monthlyFee, 0, 10_000_000)),
        otherFees: Math.round(numberInRange(body.otherFees, 0, 10_000_000)),
        averageRetentionMonths: Math.max(1, Math.round(numberInRange(body.averageRetentionMonths, 6, 120))),
      },
      create: {
        schoolId: access.schoolId!, expectedEnrollmentRate: numberInRange(body.expectedEnrollmentRate, 50, 100),
        enrollmentFee: Math.round(numberInRange(body.enrollmentFee, 0, 10_000_000)), monthlyFee: Math.round(numberInRange(body.monthlyFee, 0, 10_000_000)),
        otherFees: Math.round(numberInRange(body.otherFees, 0, 10_000_000)), averageRetentionMonths: Math.max(1, Math.round(numberInRange(body.averageRetentionMonths, 6, 120))),
      },
    });
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[monthly-kpi:update]", error);
    return NextResponse.json({ error: "計算条件の保存に失敗しました" }, { status: 500 });
  }
}
