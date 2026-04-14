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
  /** true の場合、同一 sessionId+stepKey の重複チェックをスキップして毎回記録する */
  allowDuplicate?: boolean;
};

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SessionLogBody;

    const schoolId = String(body?.schoolId ?? "").trim();
    const sessionId = String(body?.sessionId ?? "").trim();
    const stepKey = String(body?.stepKey ?? "").trim();
    const stepLabel = body?.stepLabel ? String(body.stepLabel).trim() : null;
    const allowDuplicate = body?.allowDuplicate === true;

    if (!schoolId || !sessionId || !stepKey) {
      return withCors(
        NextResponse.json(
          { message: "schoolId, sessionId, stepKey は必須です" },
          { status: 400 }
        )
      );
    }

    if (allowDuplicate) {
      // 重複チェックなし：アイコンクリックなど複数回カウントしたいイベント用
      await prisma.diagnosisSessionLog.create({
        data: { schoolId, sessionId, stepKey, stepLabel },
      });
    } else {
      // 同一セッションで同一stepKeyが既にあれば重複登録しない
      const existing = await prisma.diagnosisSessionLog.findFirst({
        where: { schoolId, sessionId, stepKey },
      });
      if (!existing) {
        await prisma.diagnosisSessionLog.create({
          data: { schoolId, sessionId, stepKey, stepLabel },
        });
      }
    }

    return withCors(NextResponse.json({ ok: true }));
  } catch (e: any) {
    console.error("❌ /api/diagnosis/session-log POST error:", e);
    return withCors(
      NextResponse.json(
        { message: e?.message ?? "Internal Server Error" },
        { status: 500 }
      )
    );
  }
}
