// app/api/logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  canAccessSchool,
  getPrincipal,
  normalizeSchoolId,
  requireSuperAdmin,
} from "@/lib/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

function clampText(input: unknown, max: number) {
  const value =
    typeof input === "string" ? input : input == null ? "" : JSON.stringify(input);
  return value.slice(0, max);
}

function resolveLogSchool(principal: NonNullable<Awaited<ReturnType<typeof getPrincipal>>>, requested: string) {
  if (requested && !canAccessSchool(principal, requested)) {
    return { ok: false as const, response: json("アクセス拒否", 403) };
  }

  if (principal.isSuperAdmin) {
    return { ok: true as const, school: requested || "" };
  }

  return { ok: true as const, school: principal.schoolId };
}

// GET: ログ読み込み（管理画面用）
export async function GET(req: NextRequest) {
  const principal = await getPrincipal();
  if (!principal) return json("未認証", 401);

  try {
    const { searchParams } = new URL(req.url);
    const requested = normalizeSchoolId(
      searchParams.get("school") ?? searchParams.get("schoolId"),
    );
    const access = resolveLogSchool(principal, requested);
    if (!access.ok) return access.response;

    const daysParam = Number(searchParams.get("days") || 0);
    const days = Number.isFinite(daysParam)
      ? Math.min(365, Math.max(0, daysParam))
      : 0;

    const where: any = {};
    if (access.school) where.school = access.school;
    if (days > 0) {
      where.timestamp = {
        gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      };
    }

    const logs = await prisma.faqLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: 2000,
    });

    return NextResponse.json(logs);
  } catch (err) {
    console.error("ログ読み込みエラー:", err);
    return json("ログ取得に失敗しました", 500);
  }
}

// POST: ログ保存（チャットボット用 + CTA用）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json("Invalid JSON body", 400);
    }

    const school = normalizeSchoolId((body as any).school ?? (body as any).schoolId);
    const sessionId = clampText((body as any).sessionId, 200).trim();
    const timestampRaw = (body as any).timestamp;
    const type = clampText((body as any).type, 50).trim();

    if (!school || !timestampRaw || !sessionId) {
      return json("school / timestamp / sessionId は必須です", 400);
    }

    if (school.length > 120 || sessionId.length > 200) {
      return json("入力値が長すぎます", 400);
    }

    if (type !== "cta" && !(body as any).question) {
      return json("FAQログでは question が必須です", 400);
    }

    const ts = new Date(timestampRaw);
    if (Number.isNaN(ts.getTime())) {
      return json("timestamp が不正です", 400);
    }

    const schoolExists = await prisma.faq.findUnique({
      where: { schoolId: school },
      select: { id: true },
    });
    if (!schoolExists) {
      return json("school が見つかりません", 404);
    }

    let questionValue: string;
    let answerValue: string;

    if (type === "cta") {
      questionValue = JSON.stringify({
        type: "cta",
        ctaId: clampText((body as any).ctaId, 120) || null,
        ctaLabel: clampText((body as any).ctaLabel, 200) || null,
      });
      answerValue = "";
    } else {
      questionValue = clampText((body as any).question, 2000);
      answerValue = clampText((body as any).answer, 4000);
    }

    await prisma.faqLog.create({
      data: {
        school,
        question: questionValue,
        answer: answerValue,
        url: clampText((body as any).url, 2000) || null,
        timestamp: ts,
        sessionId,
      },
    });

    return NextResponse.json({ message: "保存成功" }, { status: 200 });
  } catch (err) {
    console.error("ログ保存エラー:", err);
    return json("ログ保存失敗", 500);
  }
}

// DELETE: セッション単位で削除（superadmin 限定）
export async function DELETE(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { sessionId } = await req.json().catch(() => ({}));
    const sid = clampText(sessionId, 200).trim();
    if (!sid) return json("sessionId が必要です", 400);

    await prisma.faqLog.deleteMany({
      where: { sessionId: sid },
    });

    return NextResponse.json({ message: "削除完了" }, { status: 200 });
  } catch (err) {
    console.error("ログ削除エラー:", err);
    return json("サーバーエラー", 500);
  }
}
