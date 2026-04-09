// app/api/diagnosis/session-log/route.ts
// 診断ステップの通過ログを記録するAPI（認証不要・公開）
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type SessionLogBody = {
  schoolId: string;
  sessionId: string;
  stepKey: string;
  stepLabel?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SessionLogBody;

    const schoolId = String(body?.schoolId ?? "").trim();
    const sessionId = String(body?.sessionId ?? "").trim();
    const stepKey = String(body?.stepKey ?? "").trim();
    const stepLabel = body?.stepLabel ? String(body.stepLabel).trim() : null;

    if (!schoolId || !sessionId || !stepKey) {
      return NextResponse.json(
        { message: "schoolId, sessionId, stepKey は必須です" },
        { status: 400 }
      );
    }

    // 同一セッションで同一stepKeyが既にあれば重複登録しない
    const existing = await prisma.diagnosisSessionLog.findFirst({
      where: { schoolId, sessionId, stepKey },
    });

    if (!existing) {
      await prisma.diagnosisSessionLog.create({
        data: { schoolId, sessionId, stepKey, stepLabel },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("❌ /api/diagnosis/session-log POST error:", e);
    return NextResponse.json(
      { message: e?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
