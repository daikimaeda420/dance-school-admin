// app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function fmtDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes()
  )}`;
}

type FAQItem =
  | { type: "question"; question: string; answer: string; url?: string }
  | {
      type: "select";
      question: string;
      answer?: string;
      options: { label: string; next: FAQItem }[];
    };

/** FAQアイテムツリーの総ノード数をカウント */
function countFaqItems(items: FAQItem[]): number {
  let count = 0;
  const walk = (item: FAQItem) => {
    count++;
    if (item.type === "select") {
      for (const opt of item.options ?? []) {
        walk(opt.next);
      }
    }
  };
  for (const it of items ?? []) walk(it);
  return count;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const school = url.searchParams.get("school") || "";
    const days = Math.max(1, Number(url.searchParams.get("days") || 7));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const schoolFilter = school ? { schoolId: school } : {};
    const schoolFilterStr = school ? { school } : {};

    // ── Prisma 直接クエリで全データ取得 ──
    const [
      sessionCount,
      logCount,
      recentLogs,
      courseCount,
      instructorCount,
      campusCount,
      scheduleSlotCount,
      faqRow,
      formRow,
    ] = await Promise.all([
      // チャットセッション数（期間内）
      prisma.faqLog
        .findMany({
          where: { ...schoolFilterStr, timestamp: { gte: since } },
          select: { sessionId: true },
          distinct: ["sessionId"],
        })
        .then((rows) => rows.length),

      // ログ総件数（期間内）
      prisma.faqLog.count({
        where: { ...schoolFilterStr, timestamp: { gte: since } },
      }),

      // 最新のチャットログ5件
      prisma.faqLog.findMany({
        where: { ...schoolFilterStr, timestamp: { gte: since } },
        orderBy: { timestamp: "desc" },
        take: 5,
        select: { timestamp: true, question: true, sessionId: true },
      }),

      // 診断コース数（有効）
      prisma.diagnosisCourse.count({
        where: { ...schoolFilter, isActive: true },
      }),

      // 診断講師数（有効）
      prisma.diagnosisInstructor.count({
        where: { ...schoolFilter, isActive: true },
      }),

      // 診断校舎数（有効）
      prisma.diagnosisCampus.count({
        where: { ...schoolFilter, isActive: true },
      }),

      // スケジュールスロット数（有効）
      prisma.diagnosisScheduleSlot.count({
        where: { ...schoolFilter, isActive: true },
      }),

      // FAQ
      school
        ? prisma.faq.findUnique({
            where: { schoolId: school },
            select: { items: true },
          })
        : prisma.faq.findFirst({ select: { items: true } }),

      // 診断フォーム
      school
        ? prisma.diagnosisForm.findUnique({
            where: { schoolId: school },
            select: { isActive: true },
          })
        : prisma.diagnosisForm.findFirst({ select: { isActive: true } }),
    ]);

    // FAQ件数
    const faqItems = (faqRow?.items as FAQItem[] | null) ?? [];
    const faqCount = Array.isArray(faqItems) ? countFaqItems(faqItems) : 0;

    // ── KPIカード ──
    const kpis = [
      {
        label: `チャットセッション（${days}日）`,
        value: sessionCount.toLocaleString(),
        note: `ログ ${logCount.toLocaleString()} 件`,
      },
      {
        label: "診断コース",
        value: `${courseCount}`,
        note: "有効なコース数",
      },
      {
        label: "登録講師",
        value: `${instructorCount}`,
        note: "有効な講師数",
      },
      {
        label: "FAQ登録数",
        value: `${faqCount}`,
        note: "Q&Aアイテム総数",
      },
    ];

    // ── セットアップ状況 ──
    const setup = [
      { label: "コース登録", done: courseCount > 0, href: "/admin/diagnosis/courses" },
      { label: "講師登録", done: instructorCount > 0, href: "/admin/diagnosis/instructors" },
      { label: "校舎登録", done: campusCount > 0, href: "/admin/diagnosis/campuses" },
      { label: "スケジュール登録", done: scheduleSlotCount > 0, href: "/admin/diagnosis/schedule" },
      { label: "診断フォーム設定", done: !!formRow, href: "/admin/diagnosis/form" },
      { label: "FAQ登録", done: faqCount > 0, href: "/faq" },
    ];

    // ── 最近のアクティビティ ──
    const activities = recentLogs.map((l) => ({
      time: fmtDate(new Date(l.timestamp)),
      text: `「${String(l.question).slice(0, 60)}」`,
    }));

    // ── システム情報 ──
    const system = {
      version: process.env.NEXT_PUBLIC_APP_VERSION || "v0.1.0",
      env:
        process.env.NODE_ENV === "production" ? "Production" : "Development",
      lastBackup: "-",
    };

    return NextResponse.json({ kpis, setup, activities, system });
  } catch (e: any) {
    console.error("[dashboard] error:", e);
    return NextResponse.json(
      {
        kpis: [
          { label: "チャットセッション（7日）", value: "0", note: "ログ 0 件" },
          { label: "診断コース", value: "0", note: "-" },
          { label: "登録講師", value: "0", note: "-" },
          { label: "FAQ登録数", value: "0", note: "-" },
        ],
        setup: [],
        activities: [],
        system: {
          version: process.env.NEXT_PUBLIC_APP_VERSION || "v0.1.0",
          env: "Production",
          lastBackup: "-",
        },
        error: e?.message ?? "unknown",
      },
      { status: 200 }
    );
  }
}
