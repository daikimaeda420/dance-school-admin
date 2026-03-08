// app/api/admin/diagnosis/faqs/reorder/route.ts
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

// POST /api/admin/diagnosis/faqs/reorder
// body: { schoolId: string; orderedIds: string[] }
export async function POST(req: NextRequest) {
  try {
    const session = await ensureLoggedIn();
    if (!session) return json("Unauthorized", 401);

    const body = await req.json().catch(() => null);
    if (!body?.schoolId) return json("schoolId が必要です", 400);
    if (!Array.isArray(body?.orderedIds) || body.orderedIds.length === 0)
      return json("orderedIds が必要です", 400);

    const schoolId = String(body.schoolId);
    const orderedIds: string[] = body.orderedIds.map(String);

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.diagnosisFaq.updateMany({
          where: { id, schoolId },
          data: { sortOrder: index },
        }),
      ),
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return json("並び替え保存に失敗しました", 500, { detail: e?.message });
  }
}
