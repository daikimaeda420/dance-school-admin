import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function response(data: unknown, init: ResponseInit = {}) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

const clean = (value: unknown, max = 1000) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const schoolId = clean(body?.schoolId, 100);
    const name = clean(body?.name, 100);
    const email = clean(body?.email, 254);
    const phone = clean(body?.phone, 40);

    if (!schoolId || !name || (!email && !phone)) {
      return response(
        { error: "お名前と、メールアドレスまたは電話番号を入力してください。" },
        { status: 400 },
      );
    }

    const faq = await prisma.faq.findUnique({
      where: { schoolId },
      select: { reservationMode: true },
    });
    if (faq?.reservationMode !== "RIZBO") {
      return response({ error: "このスクールではチャット予約を受け付けていません。" }, { status: 403 });
    }

    await prisma.chatReservation.create({
      data: {
        schoolId,
        name,
        email: email || null,
        phone: phone || null,
        preferredDate: clean(body?.preferredDate, 100) || null,
        note: clean(body?.note, 2000) || null,
        sessionId: clean(body?.sessionId, 100) || null,
      },
    });

    return response({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/chat/reservations error:", error);
    return response({ error: "予約受付に失敗しました。時間をおいて再度お試しください。" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return response({}, { status: 204 });
}
