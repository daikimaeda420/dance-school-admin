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

/** 内部APIを叩く（Cookie転送＋タイムアウト＋no-store） */
async function fetchInternalJSON<T>(
  url: string,
  req: NextRequest,
  timeoutMs = 5000
): Promise<T | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        // 🔑 ログイン状態を引き継ぐ
        cookie: req.headers.get("cookie") ?? "",
        accept: "application/json",
      },
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!res.ok) return null; // 401/500などはnullで返す（ダッシュボードはフォールバック）
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const school = url.searchParams.get("school") || "";
    const days = Math.max(1, Number(url.searchParams.get("days") || 7));
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const origin = req.nextUrl.origin;
    const q = school ? `?school=${encodeURIComponent(school)}` : "";

    // 内部API呼び出し（Cookie転送）
    const [logs, faq] = await Promise.all([
      fetchInternalJSON<FaqLog[]>(`${origin}/api/logs${q}`, req),
      fetchInternalJSON<FAQItem[]>(`${origin}/api/faq${q}`, req),
    ]);

    const safeLogs: FaqLog[] = Array.isArray(logs) ? logs : [];
    const safeFaq: FAQItem[] = Array.isArray(faq) ? faq : [];

    // 期間内フィルタ
    const inRange = safeLogs.filter(
      (l) => new Date(l.timestamp).getTime() >= since
    );

    // KPI
    const sessions = new Set(inRange.map((l) => l.sessionId || "unknown"));
    const interactions = inRange.length;

    const counts = new Map<string, number>();
    for (const l of inRange) {
      const qtxt =
        typeof l.question === "string"
          ? l.question
          : l?.question?.text || (l?.question?.question ?? "");
      if (qtxt) counts.set(qtxt, (counts.get(qtxt) ?? 0) + 1);
    }
    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    const topShare = top
      ? Math.round((top[1] / Math.max(1, interactions)) * 100)
      : 0;

    const issues = validateFAQ(safeFaq);
    const invalidCount =
      issues.emptyQuestion +
      issues.emptyAnswer +
      issues.unlabeledOption +
      issues.invalidUrl;

    const kpis = [
      {
        label: `セッション（${days}日）`,
        value: sessions.size.toLocaleString(),
      },
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

    const tasks = [
      ...(issues.unlabeledOption
        ? [
            {
              kind: "warn" as const,
              title: "ラベル未設定の選択肢",
              count: issues.unlabeledOption,
              href: "/faq?filter=unlabeled",
            },
          ]
        : []),
      ...(issues.invalidUrl
        ? [
            {
              kind: "error" as const,
              title: "無効なURL",
              count: issues.invalidUrl,
              href: "/faq?filter=broken",
            },
          ]
        : []),
      ...(invalidCount === 0
        ? [{ kind: "info" as const, title: "問題は検出されていません" }]
        : []),
    ];

    const system = {
      version: process.env.NEXT_PUBLIC_APP_VERSION || "v0.1.0",
      env: process.env.NODE_ENV || "development",
      lastBackup: "-",
    };

    // 常に200で返す（UIを止めない）
    return NextResponse.json({ kpis, activities, tasks, system });
  } catch (e: any) {
    // 最終フォールバック：エラーでも“空ダッシュボード”を返却
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 6);
    return NextResponse.json(
      {
        kpis: [
          { label: `セッション（7日）`, value: "0" },
          { label: "人気の質問 シェア", value: "0%", note: "-" },
          { label: "未解決/要修正", value: "0件" },
          { label: "ログ件数", value: "0" },
        ],
        activities: [],
        tasks: [{ kind: "info", title: "問題は検出されていません" }],
        system: {
          version: process.env.NEXT_PUBLIC_APP_VERSION || "v0.1.0",
          env: process.env.NODE_ENV || "development",
          lastBackup: "-",
        },
        error: e?.message ?? "unknown",
      },
      { status: 200 }
    );
  }
}
