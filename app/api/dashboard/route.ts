// app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";

type FaqLog = {
  sessionId?: string;
  timestamp: string;
  question: any;
  answer?: any;
  url?: string;
};
type FAQItem =
  | { type: "question"; question: string; answer: string; url?: string }
  | {
      type: "select";
      question: string;
      answer?: string;
      options: { label: string; next: FAQItem }[];
    };

function validateFAQ(items: FAQItem[]) {
  const errors = {
    emptyQuestion: 0,
    emptyAnswer: 0,
    unlabeledOption: 0,
    invalidUrl: 0,
  };
  const walk = (item: FAQItem) => {
    if (item.type === "question") {
      if (!item.question?.trim()) errors.emptyQuestion++;
      if (!item.answer?.trim()) errors.emptyAnswer++;
      if (item.url && !/^https?:\/\//i.test(item.url)) errors.invalidUrl++;
      return;
    }
    if (!item.question?.trim()) errors.emptyQuestion++;
    for (const opt of item.options ?? []) {
      if (!opt.label?.trim()) errors.unlabeledOption++;
      walk(opt.next);
    }
  };
  for (const it of items ?? []) walk(it);
  return errors;
}

function fmtDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes()
  )}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const school = url.searchParams.get("school") || "";
  const days = Number(url.searchParams.get("days") || 7);
  const since = Date.now() - days * 24 * 60 * 60 * 1000;

  const origin = req.nextUrl.origin;

  // データ取得
  const [logsRes, faqRes] = await Promise.allSettled([
    fetch(
      `${origin}/api/logs${
        school ? `?school=${encodeURIComponent(school)}` : ""
      }`,
      { cache: "no-store" }
    ),
    fetch(
      `${origin}/api/faq${
        school ? `?school=${encodeURIComponent(school)}` : ""
      }`,
      { cache: "no-store" }
    ),
  ]);

  const logs: FaqLog[] =
    logsRes.status === "fulfilled" && logsRes.value.ok
      ? ((await logsRes.value.json()) as any[])
      : [];
  const faq: FAQItem[] =
    faqRes.status === "fulfilled" && faqRes.value.ok
      ? ((await faqRes.value.json()) as any[])
      : [];

  // 期間フィルタ
  const inRange = logs.filter((l) => new Date(l.timestamp).getTime() >= since);

  // KPI
  const sessions = new Set(inRange.map((l) => l.sessionId || "unknown"));
  const interactions = inRange.length;
  // 「人気の質問」＝質問テキストの最多出現
  const counts = new Map<string, number>();
  for (const l of inRange) {
    const q =
      typeof l.question === "string"
        ? l.question
        : l?.question?.text || (l?.question?.question ?? "");
    if (q) counts.set(q, (counts.get(q) ?? 0) + 1);
  }
  const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
  const topShare = top
    ? Math.round((top[1] / Math.max(1, interactions)) * 100)
    : 0;

  const issues = validateFAQ(faq);
  const invalidCount =
    issues.emptyQuestion +
    issues.emptyAnswer +
    issues.unlabeledOption +
    issues.invalidUrl;

  const kpis = [
    { label: `セッション（${days}日）`, value: sessions.size.toLocaleString() },
    {
      label: "人気の質問 シェア",
      value: `${topShare}%`,
      note: top ? top[0] : "-",
    },
    {
      label: "未解決/要修正",
      value: `${invalidCount}件`,
      delta: invalidCount ? `+${invalidCount}` : undefined,
      note: "バリデーション結果へ",
    },
    { label: "ログ件数", value: interactions.toLocaleString() },
  ];

  // アクティビティ（最新5件）
  const latest = inRange
    .slice()
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
    .slice(0, 5);
  const activities = latest.map((l) => {
    const txt =
      typeof l.question === "string"
        ? l.question
        : l?.question?.text || (l?.question?.question ?? "(不明な質問)");
    return { time: fmtDate(new Date(l.timestamp)), text: `「${txt}」に回答` };
  });

  // タスク
  const tasks = [
    ...(issues.unlabeledOption
      ? [
          {
            kind: "warn",
            title: "ラベル未設定の選択肢",
            count: issues.unlabeledOption,
            href: "/faq?filter=unlabeled",
          } as const,
        ]
      : []),
    ...(issues.invalidUrl
      ? [
          {
            kind: "error",
            title: "無効なURL",
            count: issues.invalidUrl,
            href: "/faq?filter=broken",
          } as const,
        ]
      : []),
    ...(invalidCount === 0
      ? [{ kind: "info", title: "問題は検出されていません" } as const]
      : []),
  ];

  const system = {
    version: process.env.NEXT_PUBLIC_APP_VERSION || "v0.1.0",
    env: process.env.NODE_ENV || "development",
    lastBackup: "-", // 必要ならここでバックアップ時刻を返すAPIに差し替え
  };

  return NextResponse.json({ kpis, activities, tasks, system });
}
