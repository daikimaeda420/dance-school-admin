// app/api/faq-log/route.ts
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeSchoolId } from "@/lib/authz";

export const runtime = "nodejs";

function json(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

function clampText(input: unknown, max: number) {
  const value =
    typeof input === "string" ? input : input == null ? "" : JSON.stringify(input);
  return value.slice(0, max);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json("Invalid JSON body", 400);

    const school = normalizeSchoolId((body as any).school ?? (body as any).schoolId);
    const question = clampText((body as any).question, 2000).trim();
    const answer = clampText((body as any).answer, 4000);
    const timestamp = new Date((body as any).timestamp ?? Date.now());
    const sessionId =
      clampText((body as any).sessionId, 200).trim() || `legacy_${randomUUID()}`;

    if (!school || !question) {
      return json("schoolId / question は必須です", 400);
    }

    if (Number.isNaN(timestamp.getTime())) {
      return json("timestamp が不正です", 400);
    }

    const schoolExists = await prisma.faq.findUnique({
      where: { schoolId: school },
      select: { id: true },
    });
    if (!schoolExists) return json("school が見つかりません", 404);

    await prisma.faqLog.create({
      data: {
        school,
        sessionId,
        timestamp,
        question,
        answer,
        url: clampText((body as any).url, 2000) || null,
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("FAQログ保存エラー:", err);
    return json("ログ保存失敗", 500);
  }
}
