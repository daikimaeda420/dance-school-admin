// app/api/admin/diagnosis/faqs/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRecordSchoolAccess } from "@/lib/authz";

export const runtime = "nodejs";

function json(message: string, status = 400, extra?: Record<string, any>) {
  return NextResponse.json({ message, ...(extra ?? {}) }, { status });
}

// PATCH /api/admin/diagnosis/faqs/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const access = await requireRecordSchoolAccess(
      () =>
        prisma.diagnosisFaq.findUnique({
          where: { id },
          select: { schoolId: true },
        }),
      "対象のFAQが見つかりません",
    );
    if (!access.ok) return access.response;

    const body = await req.json().catch(() => null);

    const data: Record<string, any> = {};
    if (body?.question != null) data.question = String(body.question).trim();
    if (body?.answer != null) data.answer = String(body.answer).trim();
    if (body?.sortOrder != null && Number.isFinite(Number(body.sortOrder)))
      data.sortOrder = Number(body.sortOrder);
    if (body?.isActive != null) data.isActive = Boolean(body.isActive);

    const updated = await prisma.diagnosisFaq.update({
      where: { id },
      data,
    });

    return NextResponse.json({ faq: updated });
  } catch (e: any) {
    return json("更新に失敗しました", 500, { detail: e?.message });
  }
}

// DELETE /api/admin/diagnosis/faqs/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const access = await requireRecordSchoolAccess(
      () =>
        prisma.diagnosisFaq.findUnique({
          where: { id },
          select: { schoolId: true },
        }),
      "対象のFAQが見つかりません",
    );
    if (!access.ok) return access.response;

    await prisma.diagnosisFaq.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return json("削除に失敗しました", 500, { detail: e?.message });
  }
}
