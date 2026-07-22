import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ActionKey = "PROMOTE_DEMAND_GENRE" | "SIMPLIFY_FORM" | "ADD_FAQ";

type FaqItem = { type: "question"; question: string; answer: string; url?: string };

function response(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(req: NextRequest) {
  const schoolId = new URL(req.url).searchParams.get("schoolId")?.trim() ?? "";
  if (!schoolId) return response("schoolId が必要です");
  const auth = await requireSchoolAccess(schoolId);
  if (!auth.ok) return auth.response;

  const improvements = await prisma.aiImprovement.findMany({
    where: { schoolId },
    orderBy: { appliedAt: "desc" },
    take: 8,
  });
  return NextResponse.json({ improvements }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const schoolId = cleanText(body.schoolId);
    const actionKey = cleanText(body.actionKey) as ActionKey;
    if (!schoolId || !actionKey) return response("schoolId と actionKey が必要です");
    const auth = await requireSchoolAccess(schoolId);
    if (!auth.ok) return auth.response;

    const baseline = Number(body.baselineValue);
    const metricKey = cleanText(body.metricKey) || null;
    const baselineValue = Number.isFinite(baseline) ? baseline : null;

    if (actionKey === "PROMOTE_DEMAND_GENRE") {
      const slug = cleanText(body.payload?.slug);
      const genre = await prisma.diagnosisGenre.findFirst({ where: { schoolId, slug, isActive: true } });
      if (!genre) return response("反映対象のジャンルが見つかりません", 404);
      await prisma.$transaction([
        prisma.diagnosisGenre.updateMany({ where: { schoolId }, data: { sortOrder: { increment: 1 } } }),
        prisma.diagnosisGenre.update({ where: { id: genre.id }, data: { sortOrder: 0 } }),
      ]);
      const improvement = await prisma.aiImprovement.create({
        data: {
          schoolId, actionKey, title: `「${genre.label}」を初期選択肢の先頭へ表示`,
          summary: "需要が伸びているジャンルを診断の最初に見つけやすくしました。",
          metricKey, baselineValue, metadata: { slug: genre.slug, label: genre.label },
        },
      });
      return NextResponse.json({ improvement });
    }

    if (actionKey === "SIMPLIFY_FORM") {
      const form = await prisma.diagnosisForm.findUnique({
        where: { schoolId }, include: { fields: { orderBy: { sortOrder: "asc" } } },
      });
      if (!form) return response("体験予約フォームが見つかりません", 404);
      const targets = form.fields.filter((field) => field.required && /電話|備考|質問|相談|住所|年齢/.test(field.label));
      if (!targets.length) return response("任意化できる入力項目がありません。フォームはすでに簡潔です。", 409);
      await prisma.diagnosisFormField.updateMany({ where: { id: { in: targets.map((field) => field.id) } }, data: { required: false } });
      const labels = targets.map((field) => field.label);
      const improvement = await prisma.aiImprovement.create({
        data: {
          schoolId, actionKey, title: "予約フォームの入力負荷を軽減",
          summary: `「${labels.join("・")}」を任意入力に変更しました。`,
          metricKey, baselineValue, metadata: { fields: labels },
        },
      });
      return NextResponse.json({ improvement });
    }

    if (actionKey === "ADD_FAQ") {
      const question = cleanText(body.payload?.question);
      const answer = cleanText(body.payload?.answer);
      if (!question || !answer) return response("Q&Aの質問と回答を確認してください");
      const faq = await prisma.faq.findUnique({ where: { schoolId }, select: { items: true } });
      const items = Array.isArray(faq?.items) ? (faq.items as unknown as FaqItem[]) : [];
      if (items.some((item) => item.type === "question" && item.question === question)) return response("同じ質問のQ&Aがすでにあります", 409);
      await prisma.faq.upsert({
        where: { schoolId },
        update: { items: [...items, { type: "question", question, answer }], updatedBy: "ai-improvements" },
        create: { schoolId, items: [{ type: "question", question, answer }], updatedBy: "ai-improvements" },
      });
      const improvement = await prisma.aiImprovement.create({
        data: {
          schoolId, actionKey, title: "よくある質問をQ&Aに追加",
          summary: `「${question}」をチャットQ&Aへ公開しました。`,
          metricKey, baselineValue, metadata: { question },
        },
      });
      return NextResponse.json({ improvement });
    }

    return response("対応していない改善アクションです");
  } catch (error) {
    console.error("[ai-improvements]", error);
    return response("改善内容の反映に失敗しました", 500);
  }
}
