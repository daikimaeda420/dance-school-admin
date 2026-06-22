export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/authz";

function json(message: string, status = 400, extra?: any) {
  return NextResponse.json({ message, ...extra }, { status });
}

function normalizeTake(value: string | null) {
  const parsed = Number(value ?? "20");
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(Math.max(Math.trunc(parsed), 1), 50);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId")?.trim();
    if (!schoolId) return json("schoolId が必要です", 400);

    const auth = await requireSchoolAccess(schoolId);
    if (!auth.ok) return auth.response;

    const logs = await prisma.diagnosisMailDeliveryLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: normalizeTake(searchParams.get("take")),
      select: {
        id: true,
        schoolId: true,
        submissionId: true,
        messageType: true,
        status: true,
        fromEmail: true,
        toEmail: true,
        ccEmail: true,
        bccEmail: true,
        replyTo: true,
        subject: true,
        messageId: true,
        accepted: true,
        rejected: true,
        response: true,
        error: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ logs });
  } catch (e: any) {
    console.error("mail-logs GET error:", e);
    return json("メール送信ログの取得に失敗しました", 500, {
      detail: e?.message ?? String(e),
    });
  }
}
