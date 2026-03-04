// app/api/admin/diagnosis/faqs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureLoggedIn() {
  const session = await getServerSession(authOptions);
  return session?.user?.email ? session : null;
}

function json(message: string, status = 400, extra?: Record<string, any>) {
  return NextResponse.json({ message, ...(extra ?? {}) }, { status });
}

// GET /api/admin/diagnosis/faqs?schoolId=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");
    if (!schoolId) return json("schoolId が必要です", 400);

    const rows = await prisma.diagnosisFaq.findMany({
      where: { schoolId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ faqs: rows });
  } catch (e: any) {
    return json("FAQ取得でエラー", 500, { detail: e?.message });
  }
}

// POST /api/admin/diagnosis/faqs
export async function POST(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const body = await req.json().catch(() => null);
    if (!body?.schoolId) return json("schoolId が必要です", 400);
    if (!body?.question?.trim()) return json("question が必要です", 400);
    if (!body?.answer?.trim()) return json("answer が必要です", 400);

    const schoolId = String(body.schoolId);
    const question = String(body.question).trim();
    const answer = String(body.answer).trim();
    const sortOrder = Number.isFinite(Number(body.sortOrder))
      ? Number(body.sortOrder)
      : 0;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

    const created = await prisma.diagnosisFaq.create({
      data: { schoolId, question, answer, sortOrder, isActive },
    });

    return NextResponse.json({ faq: created }, { status: 201 });
  } catch (e: any) {
    return json("作成に失敗しました", 500, { detail: e?.message });
  }
}
