import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAccessibleSchool } from "@/lib/authz";

const DAY = 86_400_000;
const uniqueCount = (rows: { sessionId: string }[]) => new Set(rows.map((row) => row.sessionId)).size;
const percent = (part: number, total: number) => total > 0 ? Math.round((part / total) * 100) : null;
const change = (current: number, previous: number) => previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

function parseDays(raw: string | null) {
  const days = Number(raw ?? 30);
  return Number.isFinite(days) ? Math.max(7, Math.min(90, Math.floor(days))) : 30;
}

function topicOf(question: string) {
  const value = question.toLowerCase();
  if (/料金|費用|月謝|価格|入会金/.test(value)) return "料金・費用";
  if (/体験|予約|申込|申し込み/.test(value)) return "体験・予約";
  if (/アクセス|場所|住所|駅|校舎/.test(value)) return "アクセス・校舎";
  if (/年齢|初心者|経験|大人|子供|キッズ/.test(value)) return "対象年齢・レベル";
  if (/持ち物|服装|シューズ/.test(value)) return "持ち物・服装";
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const access = await resolveAccessibleSchool(url.searchParams.get("schoolId") ?? url.searchParams.get("school"));
    if (!access.ok) return access.response;
    const schoolId = access.schoolId;
    const days = parseDays(url.searchParams.get("days"));
    const now = Date.now();
    const since = new Date(now - days * DAY);
    const previousSince = new Date(now - days * 2 * DAY);
    const logWhere = { schoolId, createdAt: { gte: previousSince } };

    const [logs, faqLogs, genres, lifestyles, forms, reservations] = await Promise.all([
      prisma.diagnosisSessionLog.findMany({ where: logWhere, select: { sessionId: true, stepKey: true, stepLabel: true, createdAt: true } }),
      prisma.faqLog.findMany({ where: { school: schoolId, timestamp: { gte: since } }, select: { question: true, sessionId: true } }),
      prisma.diagnosisGenre.findMany({ where: { schoolId, isActive: true }, select: { slug: true, label: true } }),
      prisma.diagnosisLifestyle.findMany({ where: { schoolId, isActive: true }, select: { slug: true, label: true } }),
      prisma.diagnosisFormSubmission.count({ where: { schoolId, createdAt: { gte: since } } }),
      prisma.chatReservation.count({ where: { schoolId, createdAt: { gte: since } } }),
    ]);

    const currentLogs = logs.filter((log) => log.createdAt >= since);
    const previousLogs = logs.filter((log) => log.createdAt < since);
    const countStep = (rows: typeof logs, key: string) => uniqueCount(rows.filter((row) => row.stepKey === key));
    const siteVisitors = countStep(currentLogs, "SITE_VISIT");
    const starts = countStep(currentLogs, "Q1_VIEW");
    const results = countStep(currentLogs, "RESULT_VIEW");
    const formOpens = countStep(currentLogs, "FORM_OPEN");
    const formSubmits = countStep(currentLogs, "FORM_SUBMIT") || forms;
    const previousStarts = countStep(previousLogs, "Q1_VIEW");
    const previousResults = countStep(previousLogs, "RESULT_VIEW");

    const labels = new Map([...genres, ...lifestyles].map((item) => [item.slug, item.label]));
    const currentDemand = new Map<string, Set<string>>();
    const previousDemand = new Map<string, Set<string>>();
    const addDemand = (target: Map<string, Set<string>>, row: typeof logs[number]) => {
      if (!row.stepKey.endsWith("_ANSWER") || !row.stepLabel) return;
      const match = row.stepLabel.match(/回答（(.+?)）/);
      const slug = match?.[1];
      if (!slug || !labels.has(slug)) return;
      if (!target.has(slug)) target.set(slug, new Set());
      target.get(slug)!.add(row.sessionId);
    };
    currentLogs.forEach((row) => addDemand(currentDemand, row));
    previousLogs.forEach((row) => addDemand(previousDemand, row));
    const demand = Array.from(currentDemand.entries()).map(([slug, sessions]) => ({
      label: labels.get(slug) ?? slug, count: sessions.size, change: change(sessions.size, previousDemand.get(slug)?.size ?? 0),
    })).sort((a, b) => b.count - a.count).slice(0, 6);

    const topics = new Map<string, Set<string>>();
    for (const log of faqLogs) {
      const question = String(log.question ?? "");
      if (!question || question.startsWith("{")) continue;
      const topic = topicOf(question);
      if (!topic) continue;
      if (!topics.has(topic)) topics.set(topic, new Set());
      topics.get(topic)!.add(log.sessionId);
    }
    const qaTopics = Array.from(topics.entries()).map(([label, sessions]) => ({ label, count: sessions.size })).sort((a, b) => b.count - a.count).slice(0, 5);

    const funnel = [
      { label: "設置サイトUU", count: siteVisitors }, { label: "診断開始", count: starts }, { label: "診断完了", count: results },
      { label: "フォーム到達", count: formOpens }, { label: "フォーム送信", count: formSubmits }, { label: "チャット予約希望", count: reservations },
    ];
    const dropoffSteps = [
      ["Q1_VIEW", "Q1：最初の質問", "最初の質問が自分に関係あると感じにくい"],
      ["Q2_ANSWER", "Q2：経験・目的の選択", "選択肢が自分に合うか迷っている"],
      ["Q4_ANSWER", "Q4：ジャンル選択", "自分に合うジャンルがわからない"],
      ["RESULT_VIEW", "おすすめ結果の表示", "提案内容や次の行動が弱い"],
      ["FORM_OPEN", "体験予約フォーム", "入力の負担や日程の不安がある"],
      ["FORM_SUBMIT", "予約送信", "送信直前に検討が止まっている"],
    ] as const;
    const dropoffs = dropoffSteps.slice(1).map(([key, label, reason], index) => {
      const previousKey = dropoffSteps[index][0];
      const previousCount = countStep(currentLogs, previousKey);
      const count = countStep(currentLogs, key);
      return { label, dropoffRate: previousCount > 0 ? Math.max(0, Math.round(((previousCount - count) / previousCount) * 1000) / 10) : null, reason };
    }).filter((item) => item.dropoffRate != null).sort((a, b) => (b.dropoffRate ?? 0) - (a.dropoffRate ?? 0)).slice(0, 5);
    // 設置サイトUUは visitorId、診断開始は sessionId で計測しているため、
    // 同一期間でも開始数が上回る場合は率として表示しない。
    const diagnosisStartRate = starts <= siteVisitors ? percent(starts, siteVisitors) : null;
    const suggestions: { title: string; detail: string; priority: "high" | "medium" | "low"; href: string }[] = [];
    if (diagnosisStartRate != null && diagnosisStartRate < 20) suggestions.push({ title: "診断への導線を強化", detail: `サイト訪問から診断開始への転換率は${diagnosisStartRate}%です。ファーストビュー付近に「30秒でおすすめが分かる」導線を置くことをおすすめします。`, priority: "high", href: "/faq" });
    if (starts > 0 && (percent(results, starts) ?? 0) < 60) suggestions.push({ title: "診断途中の離脱を改善", detail: `診断完了率は${percent(results, starts)}%です。質問数・選択肢のわかりやすさを確認し、最初の質問を短くしてください。`, priority: "high", href: "/admin/diagnosis/checklist" });
    if (results > 0 && (percent(formOpens, results) ?? 0) < 35) suggestions.push({ title: "結果から体験申込への誘導を改善", detail: `結果表示からフォーム到達は${percent(formOpens, results)}%です。結果の直下に、体験のメリットと空き状況を添えたCTAを置く余地があります。`, priority: "medium", href: "/admin/diagnosis/form" });
    if (formOpens > 0 && (percent(formSubmits, formOpens) ?? 0) < 40) suggestions.push({ title: "フォームの入力負荷を見直す", detail: `フォーム到達後の送信率は${percent(formSubmits, formOpens)}%です。必須項目を絞り、希望日時は「相談したい」も選べるようにしてください。`, priority: "high", href: "/admin/diagnosis/form" });
    if (qaTopics[0]) suggestions.push({ title: `${qaTopics[0].label}の案内を強化`, detail: `直近${days}日では「${qaTopics[0].label}」に関するQ&A利用が最も多く、${qaTopics[0].count}セッションありました。サイト上部とチャットの初期選択肢へ追加すると不安解消につながります。`, priority: "medium", href: "/faq" });
    if (!suggestions.length) suggestions.push({ title: "分析データを蓄積中", detail: `直近${days}日のデータがまだ少ないため、改善提案を確定できません。設置タグと診断導線を確認して継続計測してください。`, priority: "low", href: "/admin/reports/diagnosis" });

    return NextResponse.json({ days, generatedAt: new Date(), funnel, dropoffs, rates: { diagnosisStartRate, diagnosisCompletionRate: percent(results, starts), formOpenRate: percent(formOpens, results), formSubmitRate: percent(formSubmits, formOpens), overallConversionRate: percent(formSubmits + reservations, starts), diagnosisStartChange: change(starts, previousStarts), diagnosisCompletionChange: change(percent(results, starts) ?? 0, percent(previousResults, previousStarts) ?? 0) }, demand, qaTopics, suggestions });
  } catch (error) {
    console.error("[ai-insights]", error);
    return NextResponse.json({ error: "分析データの取得に失敗しました" }, { status: 500 });
  }
}
