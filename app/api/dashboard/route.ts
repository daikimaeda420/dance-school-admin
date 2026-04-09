// app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
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

/** フォーム送信フィールドから代表値を抽出するヘルパー */
function extractFieldValue(
  fields: Record<string, string>,
  keywords: string[]
): string {
  for (const key of Object.keys(fields)) {
    if (keywords.some((kw) => key.toLowerCase().includes(kw))) {
      return String(fields[key] ?? "").slice(0, 60);
    }
  }
  // キーワードにマッチしない場合、最初の値を返す
  const firstVal = Object.values(fields)[0];
  return firstVal ? String(firstVal).slice(0, 40) : "";
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
      // Q&A系
      faqSessionCount,
      faqLogCount,
      recentLogs,
      // 診断系
      courseCount,
      instructorCount,
      campusCount,
      scheduleSlotCount,
      faqRow,
      formRow,
      formSubmissionCount,
      recentSubmissions,
      // 離脱ファネル（直近のセッション数）
      sessionLogCount,
    ] = await Promise.all([
      // [Q&A] チャットセッション数（期間内）
      prisma.faqLog
        .findMany({
          where: { ...schoolFilterStr, timestamp: { gte: since } },
          select: { sessionId: true },
          distinct: ["sessionId"],
        })
        .then((rows) => rows.length),

      // [Q&A] ログ総件数（期間内）
      prisma.faqLog.count({
        where: { ...schoolFilterStr, timestamp: { gte: since } },
      }),

      // [Q&A] 最新のチャットログ5件
      prisma.faqLog.findMany({
        where: { ...schoolFilterStr, timestamp: { gte: since } },
        orderBy: { timestamp: "desc" },
        take: 5,
        select: { timestamp: true, question: true, sessionId: true },
      }),

      // [診断] コース数（有効）
      prisma.diagnosisCourse.count({
        where: { ...schoolFilter, isActive: true },
      }),

      // [診断] 講師数（有効）
      prisma.diagnosisInstructor.count({
        where: { ...schoolFilter, isActive: true },
      }),

      // [診断] 校舎数（有効）
      prisma.diagnosisCampus.count({
        where: { ...schoolFilter, isActive: true },
      }),

      // [診断] スケジュールスロット数（有効）
      prisma.diagnosisScheduleSlot.count({
        where: { ...schoolFilter, isActive: true },
      }),

      // [診断] FAQ設定
      school
        ? prisma.faq.findUnique({
            where: { schoolId: school },
            select: { items: true },
          })
        : prisma.faq.findFirst({ select: { items: true } }),

      // [診断] 診断フォーム
      school
        ? prisma.diagnosisForm.findUnique({
            where: { schoolId: school },
            select: { isActive: true },
          })
        : prisma.diagnosisForm.findFirst({ select: { isActive: true } }),

      // [診断] フォーム申込数（期間内）
      prisma.diagnosisFormSubmission.count({
        where: { ...schoolFilter, createdAt: { gte: since } },
      }),

      // [診断] 直近のコンバージョンユーザー5件
      prisma.diagnosisFormSubmission.findMany({
        where: { ...schoolFilter, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, fields: true, createdAt: true },
      }),

      // [診断] セッションログ数（離脱ファネル存在チェック）
      prisma.diagnosisSessionLog.count({
        where: { ...schoolFilter, createdAt: { gte: since } },
      }),
    ]);

    // FAQ件数
    const faqItems = (faqRow?.items as FAQItem[] | null) ?? [];
    const faqCount = Array.isArray(faqItems) ? countFaqItems(faqItems) : 0;

    // ── Q&A KPI ──
    const qaKpis = [
      {
        label: `チャットセッション数`,
        value: faqSessionCount.toLocaleString(),
        note: `直近 ${days}日間`,
      },
      {
        label: "Q&Aログ総件数",
        value: faqLogCount.toLocaleString(),
        note: `直近 ${days}日間`,
      },
      {
        label: "Q&A登録数",
        value: faqCount.toLocaleString(),
        note: "チャットボットに登録された質問数",
      },
    ];

    // ── 診断 KPI ──
    const diagnosisKpis = [
      {
        label: "フォームコンバージョン数",
        value: formSubmissionCount.toLocaleString(),
        note: `直近 ${days}日間`,
      },
      {
        label: "診断コース数",
        value: courseCount.toLocaleString(),
        note: "有効なコース",
      },
      {
        label: "登録講師数",
        value: instructorCount.toLocaleString(),
        note: "有効な講師",
      },
    ];

    // ── 直近のコンバージョンユーザー ──
    const recentConversions = recentSubmissions.map((s) => {
      const fields = (s.fields ?? {}) as Record<string, string>;
      const name = extractFieldValue(fields, ["name", "お名前", "氏名", "名前"]);
      const email = extractFieldValue(fields, ["email", "メール", "mail"]);
      const tel = extractFieldValue(fields, ["tel", "phone", "電話"]);
      return {
        id: s.id,
        name: name || "（不明）",
        email: email || "",
        tel: tel || "",
        time: fmtDate(new Date(s.createdAt)),
      };
    });

    // ── セットアップ状況 ──
    const setup = [
      { label: "コース登録", done: courseCount > 0, href: "/admin/diagnosis/courses" },
      { label: "講師登録", done: instructorCount > 0, href: "/admin/diagnosis/instructors" },
      { label: "校舎登録", done: campusCount > 0, href: "/admin/diagnosis/campuses" },
      { label: "スケジュール登録", done: scheduleSlotCount > 0, href: "/admin/diagnosis/schedule" },
      { label: "診断フォーム設定", done: !!formRow, href: "/admin/diagnosis/form" },
      { label: "FAQ登録", done: faqCount > 0, href: "/faq" },
    ];

    // ── Q&A 最近のアクティビティ ──
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

    return NextResponse.json({
      // Q&A
      qaKpis,
      activities,
      // 診断
      diagnosisKpis,
      recentConversions,
      hasSessionLogs: sessionLogCount > 0,
      // セットアップ
      setup,
      // システム
      system,
      // 後方互換性のために kpis も返す（既存コードが参照している場合）
      kpis: [...qaKpis, ...diagnosisKpis],
    });
  } catch (e: any) {
    console.error("[dashboard] error:", e);
    return NextResponse.json(
      {
        qaKpis: [],
        activities: [],
        diagnosisKpis: [],
        recentConversions: [],
        hasSessionLogs: false,
        setup: [],
        system: {
          version: process.env.NEXT_PUBLIC_APP_VERSION || "v0.1.0",
          env: "Production",
          lastBackup: "-",
        },
        kpis: [
          { label: "チャットセッション（7日）", value: "0", note: "ログ 0 件" },
          { label: "フォーム申込数", value: "0", note: "コンバージョン" },
          { label: "ダッシュボードエラー発生", value: "ERR", note: e?.message ? String(e.message).slice(0, 40) : "unknown error" },
        ],
        error: e?.stack ? String(e.stack) : (e?.message ?? "unknown"),
      },
      { status: 200 }
    );
  }
}
